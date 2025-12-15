/**
 * User Service
 * ユーザーのCRUD操作
 *
 * 要件対応:
 * - Tier3: ユーザー認証・マルチユーザー対応（将来拡張）
 * - 現在のスキーマではUserはid, createdAtのみ
 */

import { User } from "@prisma/client";
import { usersRepository } from "@/server/repositories";
import {
  ServiceError,
  PaginationInput,
  PaginatedResult,
  normalizePagination,
  buildPaginatedResult,
} from "../types";

/**
 * ユーザー一覧取得の入力
 */
export interface ListUsersInput {
  pagination?: PaginationInput;
}

/**
 * ユーザー数をカウント
 * 初回登録判定などに使用
 */
export async function countUsers(): Promise<number> {
  return usersRepository.count({});
}

/**
 * ユーザー一覧を取得
 */
export async function listUsers(
  input: ListUsersInput
): Promise<PaginatedResult<User>> {
  const { page, limit, skip } = normalizePagination(input.pagination);

  const [users, total] = await Promise.all([
    usersRepository.findMany({}, { take: limit, skip }),
    usersRepository.count({}),
  ]);

  return buildPaginatedResult(users, total, page, limit);
}

/**
 * ユーザー詳細を取得
 */
export async function getUserById(id: string): Promise<User> {
  const user = await usersRepository.findById(id);

  if (!user) {
    throw new ServiceError("ユーザーが見つかりません", "NOT_FOUND", { id });
  }

  return user;
}

/**
 * ユーザーを作成
 */
export async function createUser(): Promise<User> {
  return usersRepository.create({});
}

/**
 * ユーザーを削除
 * 注意: 関連データ（ノート、プロジェクト等）も削除される可能性あり
 * Prismaのカスケード設定に依存
 */
export async function deleteUser(id: string): Promise<void> {
  await getUserById(id);
  await usersRepository.deleteById(id);
}
