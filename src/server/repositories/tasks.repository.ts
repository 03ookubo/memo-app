/**
 * Task Repository
 * タスクの純粋なCRUD操作のみを提供
 * 完了/未完了の切り替え、期限フィルタリング等はService層で実装
 */

import { Prisma, Task } from "@prisma/client";
import prisma from "@/lib/prisma";
import { TransactionClient, FindOptions, SortOrder } from "./types";

/**
 * タスク取得時のIncludeオプション
 */
export interface TaskIncludeOptions {
  note?: boolean;
}

/**
 * タスク検索のソートオプション
 */
export interface TaskSortOptions {
  sortBy?: "createdAt" | "updatedAt" | "dueAt" | "priority" | "completedAt";
  sortOrder?: SortOrder;
}

/**
 * Includeオプションを構築
 */
function buildInclude(
  options?: TaskIncludeOptions
): Prisma.TaskInclude | undefined {
  if (!options) return undefined;

  return {
    note: options.note,
  };
}

export const tasksRepository = {
  /**
   * IDでタスクを取得
   */
  async findById(
    id: string,
    include?: TaskIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Task | null> {
    return tx.task.findUnique({
      where: { id },
      include: buildInclude(include),
    });
  },

  /**
   * ノートIDでタスクを取得
   */
  async findByNoteId(
    noteId: string,
    include?: TaskIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Task | null> {
    return tx.task.findUnique({
      where: { noteId },
      include: buildInclude(include),
    });
  },

  /**
   * 複数タスクを取得
   */
  async findMany(
    where: Prisma.TaskWhereInput = {},
    options: FindOptions & TaskSortOptions = {},
    include?: TaskIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Task[]> {
    const { take, skip, sortBy = "createdAt", sortOrder = "desc" } = options;

    return tx.task.findMany({
      where,
      take,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: buildInclude(include),
    });
  },

  /**
   * タスクを作成
   */
  async create(
    data: Prisma.TaskCreateInput,
    tx: TransactionClient = prisma
  ): Promise<Task> {
    return tx.task.create({
      data,
    });
  },

  /**
   * タスクを更新
   */
  async updateById(
    id: string,
    data: Prisma.TaskUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<Task> {
    return tx.task.update({
      where: { id },
      data,
    });
  },

  /**
   * ノートIDでタスクを更新
   */
  async updateByNoteId(
    noteId: string,
    data: Prisma.TaskUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<Task> {
    return tx.task.update({
      where: { noteId },
      data,
    });
  },

  /**
   * タスクを削除
   */
  async deleteById(id: string, tx: TransactionClient = prisma): Promise<Task> {
    return tx.task.delete({
      where: { id },
    });
  },

  /**
   * ノートIDでタスクを削除
   */
  async deleteByNoteId(
    noteId: string,
    tx: TransactionClient = prisma
  ): Promise<Task> {
    return tx.task.delete({
      where: { noteId },
    });
  },

  /**
   * タスクの件数を取得
   */
  async count(
    where: Prisma.TaskWhereInput = {},
    tx: TransactionClient = prisma
  ): Promise<number> {
    return tx.task.count({ where });
  },
};
