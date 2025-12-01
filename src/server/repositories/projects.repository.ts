/**
 * Project Repository
 * プロジェクトの純粋なCRUD操作のみを提供
 * ビジネスロジック（ソフトデリート、アーカイブ等）はService層で実装
 */

import { Prisma, Project } from "@prisma/client";
import prisma from "@/lib/prisma";
import { TransactionClient, FindOptions, SortOrder } from "./types";

/**
 * プロジェクト取得時のIncludeオプション
 */
export interface ProjectIncludeOptions {
  notes?: boolean;
  owner?: boolean;
}

/**
 * プロジェクト検索のソートオプション
 */
export interface ProjectSortOptions {
  sortBy?: "createdAt" | "updatedAt" | "sortIndex" | "name";
  sortOrder?: SortOrder;
}

/**
 * Includeオプションを構築
 */
function buildInclude(
  options?: ProjectIncludeOptions
): Prisma.ProjectInclude | undefined {
  if (!options) return undefined;

  return {
    notes: options.notes,
    owner: options.owner,
  };
}

export const projectsRepository = {
  /**
   * IDでプロジェクトを取得
   */
  async findById(
    id: string,
    include?: ProjectIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Project | null> {
    return tx.project.findUnique({
      where: { id },
      include: buildInclude(include),
    });
  },

  /**
   * 複数プロジェクトを取得
   */
  async findMany(
    where: Prisma.ProjectWhereInput = {},
    options: FindOptions & ProjectSortOptions = {},
    include?: ProjectIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Project[]> {
    const { take, skip, sortBy = "sortIndex", sortOrder = "asc" } = options;

    return tx.project.findMany({
      where,
      take,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: buildInclude(include),
    });
  },

  /**
   * オーナーIDと名前でプロジェクトを取得（一意性チェック用）
   */
  async findByOwnerIdAndName(
    ownerId: string,
    name: string,
    tx: TransactionClient = prisma
  ): Promise<Project | null> {
    return tx.project.findUnique({
      where: {
        ownerId_name: { ownerId, name },
      },
    });
  },

  /**
   * プロジェクトを作成
   */
  async create(
    data: Prisma.ProjectCreateInput,
    tx: TransactionClient = prisma
  ): Promise<Project> {
    return tx.project.create({
      data,
    });
  },

  /**
   * プロジェクトを更新
   */
  async updateById(
    id: string,
    data: Prisma.ProjectUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<Project> {
    return tx.project.update({
      where: { id },
      data,
    });
  },

  /**
   * プロジェクトを物理削除
   */
  async deleteById(
    id: string,
    tx: TransactionClient = prisma
  ): Promise<Project> {
    return tx.project.delete({
      where: { id },
    });
  },

  /**
   * プロジェクトの件数を取得
   */
  async count(
    where: Prisma.ProjectWhereInput = {},
    tx: TransactionClient = prisma
  ): Promise<number> {
    return tx.project.count({ where });
  },
};
