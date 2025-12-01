/**
 * Repository層の共通型定義
 */

import { PrismaClient } from "@prisma/client";

/**
 * トランザクション用のPrismaClient型
 * prisma.$transaction(async (tx) => { ... }) の tx の型
 */
export type TransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * 共通の検索オプション
 */
export interface FindOptions {
  take?: number;
  skip?: number;
}

/**
 * ソート順
 */
export type SortOrder = "asc" | "desc";
