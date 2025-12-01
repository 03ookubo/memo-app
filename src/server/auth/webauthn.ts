/**
 * WebAuthn ヘルパー
 * パスキーの登録・認証オプション生成と検証
 */

import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";
import { prisma } from "@/lib/prisma";
import type { Credential, User } from "@prisma/client";

// ============================================================================
// 環境変数
// ============================================================================

const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const RP_NAME = process.env.WEBAUTHN_RP_NAME || "メモアプリ";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

// ============================================================================
// 型定義
// ============================================================================

interface WebAuthnChallenge {
  challenge: string;
  userId?: string;
  expiresAt: Date;
}

// チャレンジの一時保存（本番ではRedis等を使用）
const challengeStore = new Map<string, WebAuthnChallenge>();

// ============================================================================
// 登録（Registration）
// ============================================================================

/**
 * パスキー登録オプションを生成
 */
export async function generateWebAuthnRegistrationOptions(
  userId: string,
  userName?: string
): Promise<{
  options: PublicKeyCredentialCreationOptionsJSON;
  challenge: string;
}> {
  // 既存の Credential を取得（除外リストに使用）
  const existingCredentials = await prisma.credential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  const excludeCredentials = existingCredentials.map((cred) => ({
    id: cred.credentialId,
    type: "public-key" as const,
    transports: cred.transports as AuthenticatorTransportFuture[],
  }));

  const opts: GenerateRegistrationOptionsOpts = {
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: userId,
    userName: userName || userId,
    userDisplayName: userName || "ユーザー",
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  };

  const options = await generateRegistrationOptions(opts);

  // チャレンジを保存（5分間有効）
  const challenge = options.challenge;
  challengeStore.set(userId, {
    challenge,
    userId,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  return { options, challenge };
}

/**
 * 登録レスポンスを検証し、Credential を保存
 */
export async function verifyWebAuthnRegistration(
  userId: string,
  response: RegistrationResponseJSON
): Promise<{ verified: boolean; credential?: Credential; error?: string }> {
  // チャレンジを取得
  const storedChallenge = challengeStore.get(userId);
  if (!storedChallenge) {
    return { verified: false, error: "チャレンジが見つかりません" };
  }

  if (new Date() > storedChallenge.expiresAt) {
    challengeStore.delete(userId);
    return { verified: false, error: "チャレンジが期限切れです" };
  }

  try {
    const opts: VerifyRegistrationResponseOpts = {
      response,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    };

    const verification: VerifiedRegistrationResponse =
      await verifyRegistrationResponse(opts);

    if (!verification.verified || !verification.registrationInfo) {
      return { verified: false, error: "検証に失敗しました" };
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = verification.registrationInfo;

    // Credential を保存
    const credential = await prisma.credential.create({
      data: {
        userId,
        credentialId: Buffer.from(credentialID),
        publicKey: Buffer.from(credentialPublicKey),
        counter: BigInt(counter),
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: response.response.transports || [],
      },
    });

    // チャレンジを削除
    challengeStore.delete(userId);

    return { verified: true, credential };
  } catch (error) {
    console.error("WebAuthn registration verification error:", error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : "検証エラー",
    };
  }
}

// ============================================================================
// 認証（Authentication）
// ============================================================================

/**
 * パスキー認証オプションを生成
 */
export async function generateWebAuthnAuthenticationOptions(
  userId?: string
): Promise<{
  options: PublicKeyCredentialRequestOptionsJSON;
  challenge: string;
}> {
  let allowCredentials: {
    id: Uint8Array;
    type: "public-key";
    transports?: AuthenticatorTransportFuture[];
  }[] = [];

  if (userId) {
    // 特定ユーザーの Credential のみ許可
    const credentials = await prisma.credential.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });

    allowCredentials = credentials.map((cred) => ({
      id: cred.credentialId,
      type: "public-key" as const,
      transports: cred.transports as AuthenticatorTransportFuture[],
    }));
  }

  const opts: GenerateAuthenticationOptionsOpts = {
    rpID: RP_ID,
    allowCredentials:
      allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: "preferred",
  };

  const options = await generateAuthenticationOptions(opts);

  // チャレンジを保存（5分間有効）
  const challenge = options.challenge;
  const storeKey = userId || `auth_${challenge}`;
  challengeStore.set(storeKey, {
    challenge,
    userId,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  return { options, challenge };
}

/**
 * 認証レスポンスを検証
 */
export async function verifyWebAuthnAuthentication(
  response: AuthenticationResponseJSON,
  challengeKey?: string
): Promise<{ verified: boolean; user?: User; error?: string }> {
  // credential ID から Credential を取得
  const credentialIdBuffer = Buffer.from(response.id, "base64url");
  const credential = await prisma.credential.findUnique({
    where: { credentialId: credentialIdBuffer },
    include: { user: true },
  });

  if (!credential) {
    return { verified: false, error: "認証情報が見つかりません" };
  }

  // チャレンジを取得
  const storeKey = challengeKey || credential.userId || `auth_${response.id}`;
  const storedChallenge =
    challengeStore.get(storeKey) ||
    challengeStore.get(credential.userId) ||
    challengeStore.get(`auth_${response.id}`);

  if (!storedChallenge) {
    return { verified: false, error: "チャレンジが見つかりません" };
  }

  if (new Date() > storedChallenge.expiresAt) {
    challengeStore.delete(storeKey);
    return { verified: false, error: "チャレンジが期限切れです" };
  }

  try {
    const opts: VerifyAuthenticationResponseOpts = {
      response,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: credential.credentialId,
        credentialPublicKey: credential.publicKey,
        counter: Number(credential.counter),
        transports: credential.transports as AuthenticatorTransportFuture[],
      },
      requireUserVerification: false,
    };

    const verification: VerifiedAuthenticationResponse =
      await verifyAuthenticationResponse(opts);

    if (!verification.verified) {
      return { verified: false, error: "認証に失敗しました" };
    }

    // カウンターを更新
    await prisma.credential.update({
      where: { id: credential.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    // チャレンジを削除
    challengeStore.delete(storeKey);

    return { verified: true, user: credential.user };
  } catch (error) {
    console.error("WebAuthn authentication verification error:", error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : "認証エラー",
    };
  }
}

// ============================================================================
// ユーティリティ
// ============================================================================

/**
 * ユーザーが登録済みかチェック
 */
export async function hasRegisteredUser(): Promise<boolean> {
  const count = await prisma.user.count();
  return count > 0;
}

/**
 * 最初のユーザーを取得（シングルユーザーモード用）
 */
export async function getFirstUser(): Promise<User | null> {
  return prisma.user.findFirst();
}

/**
 * ユーザーの Credential 一覧を取得
 */
export async function getUserCredentials(userId: string) {
  return prisma.credential.findMany({
    where: { userId },
    select: {
      id: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}

/**
 * Credential を削除
 */
export async function deleteCredential(
  credentialId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.credential.deleteMany({
    where: {
      id: credentialId,
      userId,
    },
  });
  return result.count > 0;
}

// 型エクスポート
export type PublicKeyCredentialCreationOptionsJSON = Awaited<
  ReturnType<typeof generateRegistrationOptions>
>;
export type PublicKeyCredentialRequestOptionsJSON = Awaited<
  ReturnType<typeof generateAuthenticationOptions>
>;
