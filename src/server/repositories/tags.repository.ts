/**
 * Tag Repository
 * タグの純粋なCRUD操作のみを提供
 * スコープ別フィルタリング等のビジネスロジックはService層で実装
 */

import { Prisma, Tag, TagScope } from "@prisma/client";
import prisma from "@/lib/prisma";
import { TransactionClient, FindOptions, SortOrder } from "./types";

/**
 * タグ取得時のIncludeオプション
 */
export interface TagIncludeOptions {
  notes?: boolean;
  owner?: boolean;
}

/**
 * タグ検索のソートオプション
 */
export interface TagSortOptions {
  sortBy?: "createdAt" | "updatedAt" | "name";
  sortOrder?: SortOrder;
}

/**
 * Includeオプションを構築
 */
function buildInclude(
  options?: TagIncludeOptions
): Prisma.TagInclude | undefined {
  if (!options) return undefined;

  return {
    notes: options.notes ? { include: { note: true } } : undefined,
    owner: options.owner,
  };
}

export const tagsRepository = {
  /**
   * IDでタグを取得
   */
  async findById(
    id: string,
    include?: TagIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Tag | null> {
    return tx.tag.findUnique({
      where: { id },
      include: buildInclude(include),
    });
  },

  /**
   * 複数タグを取得
   */
  async findMany(
    where: Prisma.TagWhereInput = {},
    options: FindOptions & TagSortOptions = {},
    include?: TagIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Tag[]> {
    const { take, skip, sortBy = "name", sortOrder = "asc" } = options;

    return tx.tag.findMany({
      where,
      take,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: buildInclude(include),
    });
  },

  /**
   * スコープと名前でタグを検索（一意性チェック用）
   * SYSTEMタグの場合はownerIdをnullで、USERタグの場合はownerIdを指定して検索
   */
  async findByScopeAndName(
    scope: TagScope,
    name: string,
    ownerId: string | null | undefined,
    tx: TransactionClient = prisma
  ): Promise<Tag | null> {
    // Prismaの複合ユニーク制約でnullを含む検索はfindFirstを使用
    return tx.tag.findFirst({
      where: {
        scope,
        name,
        ownerId: ownerId ?? null,
      },
    });
  },

  /**
   * スコープと色でタグを検索（一意性チェック用）
   * SYSTEMタグの場合はownerIdをnullで、USERタグの場合はownerIdを指定して検索
   */
  async findByScopeAndColor(
    scope: TagScope,
    color: string,
    ownerId: string | null | undefined,
    tx: TransactionClient = prisma
  ): Promise<Tag | null> {
    // Prismaの複合ユニーク制約でnullを含む検索はfindFirstを使用
    return tx.tag.findFirst({
      where: {
        scope,
        color,
        ownerId: ownerId ?? null,
      },
    });
  },

  /**
   * タグを作成
   */
  async create(
    data: Prisma.TagCreateInput,
    tx: TransactionClient = prisma
  ): Promise<Tag> {
    return tx.tag.create({
      data,
    });
  },

  /**
   * タグを更新
   */
  async updateById(
    id: string,
    data: Prisma.TagUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<Tag> {
    return tx.tag.update({
      where: { id },
      data,
    });
  },

  /**
   * タグを削除
   */
  async deleteById(id: string, tx: TransactionClient = prisma): Promise<Tag> {
    return tx.tag.delete({
      where: { id },
    });
  },

  /**
   * タグの件数を取得
   */
  async count(
    where: Prisma.TagWhereInput = {},
    tx: TransactionClient = prisma
  ): Promise<number> {
    return tx.tag.count({ where });
  },
};
