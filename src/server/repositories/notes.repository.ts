/**
 * Note Repository
 * ノートの純粋なCRUD操作のみを提供
 * ビジネスロジック（ソフトデリート、アーカイブ等）はService層で実装
 */

import { Prisma, Note } from "@prisma/client";
import prisma from "@/lib/prisma";
import { TransactionClient, FindOptions, SortOrder } from "./types";

/**
 * ノート取得時のIncludeオプション
 */
export interface NoteIncludeOptions {
  task?: boolean;
  event?: boolean;
  tags?: boolean;
  attachments?: boolean;
  children?: boolean;
  project?: boolean;
}

/**
 * ノート検索のソートオプション
 */
export interface NoteSortOptions {
  sortBy?: "createdAt" | "updatedAt" | "sortIndex" | "title";
  sortOrder?: SortOrder;
}

/**
 * Includeオプションを構築
 */
function buildInclude(
  options?: NoteIncludeOptions
): Prisma.NoteInclude | undefined {
  if (!options) return undefined;

  return {
    task: options.task,
    event: options.event,
    tags: options.tags ? { include: { tag: true } } : undefined,
    attachments: options.attachments
      ? { orderBy: { position: "asc" } }
      : undefined,
    children: options.children,
    project: options.project,
  };
}

export const notesRepository = {
  /**
   * IDでノートを取得
   */
  async findById(
    id: string,
    include?: NoteIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Note | null> {
    return tx.note.findUnique({
      where: { id },
      include: buildInclude(include),
    });
  },

  /**
   * 複数ノートを取得
   */
  async findMany(
    where: Prisma.NoteWhereInput = {},
    options: FindOptions & NoteSortOptions = {},
    include?: NoteIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Note[]> {
    const { take, skip, sortBy = "createdAt", sortOrder = "desc" } = options;

    return tx.note.findMany({
      where,
      take,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: buildInclude(include),
    });
  },

  /**
   * ノートを作成
   */
  async create(
    data: Prisma.NoteCreateInput,
    tx: TransactionClient = prisma
  ): Promise<Note> {
    return tx.note.create({
      data,
    });
  },

  /**
   * ノートを更新
   */
  async updateById(
    id: string,
    data: Prisma.NoteUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<Note> {
    return tx.note.update({
      where: { id },
      data,
    });
  },

  /**
   * ノートを物理削除
   */
  async deleteById(id: string, tx: TransactionClient = prisma): Promise<Note> {
    return tx.note.delete({
      where: { id },
    });
  },

  /**
   * ノートの件数を取得
   */
  async count(
    where: Prisma.NoteWhereInput = {},
    tx: TransactionClient = prisma
  ): Promise<number> {
    return tx.note.count({ where });
  },
};
