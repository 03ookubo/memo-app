/**
 * 認証関連の型定義
 */

import type { User } from "@prisma/client";

/**
 * セッションに含まれるユーザー情報
 */
export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

/**
 * 認証済みユーザー（Prisma User + Session情報）
 */
export type AuthenticatedUser = Pick<User, "id" | "name" | "email">;

/**
 * WebAuthn 登録オプション生成用の入力
 */
export interface GenerateRegistrationOptionsInput {
  userId: string;
  userName?: string;
}

/**
 * WebAuthn 認証オプション生成用の入力
 */
export interface GenerateAuthenticationOptionsInput {
  userId?: string; // 特定ユーザーの場合
}

/**
 * WebAuthn 登録検証用の入力
 */
export interface VerifyRegistrationInput {
  userId: string;
  credential: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
      transports?: string[];
    };
    type: string;
    clientExtensionResults: Record<string, unknown>;
    authenticatorAttachment?: string;
  };
  challenge: string;
}

/**
 * WebAuthn 認証検証用の入力
 */
export interface VerifyAuthenticationInput {
  credential: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle?: string;
    };
    type: string;
    clientExtensionResults: Record<string, unknown>;
    authenticatorAttachment?: string;
  };
  challenge: string;
}

/**
 * リンクコード生成結果
 */
export interface LinkCodeResult {
  code: string;
  expiresAt: Date;
}

/**
 * リンクコード検証結果
 */
export interface LinkCodeVerifyResult {
  valid: boolean;
  userId?: string;
  error?: string;
}
