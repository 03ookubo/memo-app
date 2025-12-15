/**
 * Events Repository
 * カレンダーイベント関連のデータベース操作
 */

import { Prisma, Event } from "@prisma/client";
import { TransactionClient } from "./types";
import prisma from "@/lib/prisma";

/**
 * Include オプション型定義
 */
export type EventIncludeOptions = {
  note?: boolean;
};

/**
 * Sort オプション型定義
 */
export type EventSortOptions = {
  sortBy?: "startAt" | "endAt" | "createdAt";
  sortOrder?: "asc" | "desc";
  take?: number;
  skip?: number;
};

/**
 * eventsRepository の実装
 */
export const eventsRepository = {
  /**
   * ID でイベントを取得
   */
  findById: async (
    id: string,
    include?: EventIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Event | null> => {
    return tx.event.findUnique({
      where: { id },
      include,
    });
  },

  /**
   * ノートIDでイベントを取得（1対1）
   */
  findByNoteId: async (
    noteId: string,
    include?: EventIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Event | null> => {
    return tx.event.findUnique({
      where: { noteId },
      include,
    });
  },

  /**
   * イベント一覧を取得（日付範囲でフィルタ可能）
   */
  findMany: async (
    where: Prisma.EventWhereInput,
    options: EventSortOptions,
    include?: EventIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Event[]> => {
    const { sortBy = "startAt", sortOrder = "asc", take, skip } = options;

    return tx.event.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take,
      skip,
      include,
    });
  },

  /**
   * イベントを作成
   */
  create: async (
    data: Prisma.EventCreateInput,
    tx: TransactionClient = prisma
  ): Promise<Event> => {
    return tx.event.create({ data });
  },

  /**
   * ID でイベントを更新
   */
  updateById: async (
    id: string,
    data: Prisma.EventUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<Event> => {
    return tx.event.update({
      where: { id },
      data,
    });
  },

  /**
   * ノートIDでイベントを更新（1対1）
   */
  updateByNoteId: async (
    noteId: string,
    data: Prisma.EventUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<Event> => {
    return tx.event.update({
      where: { noteId },
      data,
    });
  },

  /**
   * ID でイベントを削除
   */
  deleteById: async (
    id: string,
    tx: TransactionClient = prisma
  ): Promise<Event> => {
    return tx.event.delete({
      where: { id },
    });
  },

  /**
   * ノートIDでイベントを削除（1対1）
   */
  deleteByNoteId: async (
    noteId: string,
    tx: TransactionClient = prisma
  ): Promise<Event> => {
    return tx.event.delete({
      where: { noteId },
    });
  },

  /**
   * イベント数をカウント
   */
  count: async (
    where: Prisma.EventWhereInput,
    tx: TransactionClient = prisma
  ): Promise<number> => {
    return tx.event.count({ where });
  },
};
