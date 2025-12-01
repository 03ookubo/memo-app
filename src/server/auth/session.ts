/**
 * セッションヘルパー
 * サーバーサイドで認証ユーザーを取得するためのユーティリティ
 */

import { auth } from "./auth.config";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/server/services/types";
import type { User } from "@prisma/client";
import type { Session } from "next-auth";

/**
 * セッションからユーザー情報を取得（軽量版）
 * セッションの user 情報のみを返す（DB アクセスなし）
 */
export async function getSession(): Promise<Session | null> {
  return auth();
}

/**
 * 現在の認証ユーザーを取得
 * セッションが有効な場合、DB から最新のユーザー情報を取得
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  return user;
}

/**
 * 認証必須のガード関数
 * 未認証の場合は ServiceError をスロー
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new ServiceError("認証が必要です", "PERMISSION_DENIED");
  }

  return user;
}

/**
 * セッションから userId のみを取得（高速版）
 * DB アクセスなしでユーザー ID のみを返す
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * 認証必須で userId のみを取得（高速版）
 * 未認証の場合は ServiceError をスロー
 */
export async function requireAuthUserId(): Promise<string> {
  const userId = await getSessionUserId();

  if (!userId) {
    throw new ServiceError("認証が必要です", "PERMISSION_DENIED");
  }

  return userId;
}

/**
 * ユーザーが特定のリソースの所有者かチェック
 */
export async function isResourceOwner(
  resourceOwnerId: string
): Promise<boolean> {
  const userId = await getSessionUserId();
  return userId === resourceOwnerId;
}

/**
 * リソース所有者チェック付きガード
 * 所有者でない場合は ServiceError をスロー
 */
export async function requireResourceOwner(
  resourceOwnerId: string
): Promise<string> {
  const userId = await requireAuthUserId();

  if (userId !== resourceOwnerId) {
    throw new ServiceError(
      "このリソースへのアクセス権がありません",
      "PERMISSION_DENIED"
    );
  }

  return userId;
}
