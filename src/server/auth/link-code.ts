/**
 * リンクコードヘルパー
 * デバイス追加用の6桁コード生成・検証
 */

import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/server/services/types";
import type { LinkCodeResult, LinkCodeVerifyResult } from "./types";

// ============================================================================
// 定数
// ============================================================================

/** コードの有効期限（5分） */
const CODE_EXPIRY_MINUTES = 5;

/** コード生成のレート制限（1分） */
const RATE_LIMIT_MINUTES = 1;

/** コードの長さ */
const CODE_LENGTH = 6;

/** コードに使用する文字（紛らわしい文字を除外） */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// ============================================================================
// コード生成
// ============================================================================

/**
 * ランダムな6桁コードを生成
 */
function generateRandomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARS.length);
    code += CODE_CHARS[randomIndex];
  }
  return code;
}

/**
 * リンクコードを生成
 * レート制限: 1分に1回まで
 */
export async function generateLinkCode(
  userId: string
): Promise<LinkCodeResult> {
  // ユーザーの存在確認
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ServiceError("ユーザーが見つかりません", "NOT_FOUND");
  }

  // レート制限チェック（1分以内に生成されたコードがあるか）
  const recentCode = await prisma.linkCode.findFirst({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000),
      },
    },
  });

  if (recentCode) {
    throw new ServiceError(
      "コード生成のレート制限に達しました。1分後に再試行してください。",
      "INVALID_OPERATION"
    );
  }

  // 既存の未使用コードを無効化
  await prisma.linkCode.deleteMany({
    where: {
      userId,
      usedAt: null,
    },
  });

  // 新しいコードを生成
  const code = generateRandomCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  // 重複チェック＆再生成（念のため）
  let attempts = 0;
  let finalCode = code;
  while (attempts < 5) {
    const existing = await prisma.linkCode.findUnique({
      where: { code: finalCode },
    });
    if (!existing) break;
    finalCode = generateRandomCode();
    attempts++;
  }

  // コードを保存
  await prisma.linkCode.create({
    data: {
      userId,
      code: finalCode,
      expiresAt,
    },
  });

  return {
    code: finalCode,
    expiresAt,
  };
}

// ============================================================================
// コード検証
// ============================================================================

/**
 * リンクコードを検証
 * 有効なコードの場合、userId を返す
 */
export async function verifyLinkCode(
  code: string
): Promise<LinkCodeVerifyResult> {
  // コードを正規化（大文字化、スペース除去）
  const normalizedCode = code.toUpperCase().replace(/\s/g, "");

  if (normalizedCode.length !== CODE_LENGTH) {
    return { valid: false, error: "無効なコード形式です" };
  }

  // コードを検索
  const linkCode = await prisma.linkCode.findUnique({
    where: { code: normalizedCode },
  });

  if (!linkCode) {
    return { valid: false, error: "コードが見つかりません" };
  }

  // 有効期限チェック
  if (new Date() > linkCode.expiresAt) {
    // 期限切れのコードを削除
    await prisma.linkCode.delete({
      where: { id: linkCode.id },
    });
    return { valid: false, error: "コードの有効期限が切れています" };
  }

  // 使用済みチェック
  if (linkCode.usedAt) {
    return { valid: false, error: "このコードは既に使用されています" };
  }

  return {
    valid: true,
    userId: linkCode.userId,
  };
}

/**
 * リンクコードを使用済みにマーク
 */
export async function markLinkCodeAsUsed(code: string): Promise<void> {
  const normalizedCode = code.toUpperCase().replace(/\s/g, "");

  await prisma.linkCode.update({
    where: { code: normalizedCode },
    data: { usedAt: new Date() },
  });
}

// ============================================================================
// クリーンアップ
// ============================================================================

/**
 * 期限切れのリンクコードを削除
 * 定期的なクリーンアップ用
 */
export async function cleanupExpiredLinkCodes(): Promise<number> {
  const result = await prisma.linkCode.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
    },
  });

  return result.count;
}

/**
 * ユーザーのすべてのリンクコードを削除
 */
export async function deleteUserLinkCodes(userId: string): Promise<number> {
  const result = await prisma.linkCode.deleteMany({
    where: { userId },
  });

  return result.count;
}
