/**
 * Event Service
 * イベントの読み取り・書き込み操作
 */

import { Event } from "@prisma/client";
import {
  eventsRepository,
  EventIncludeOptions,
  EventSortOptions,
} from "@/server/repositories";
import { ServiceError } from "../types";

/**
 * イベント一覧取得の入力
 */
export interface ListEventsInput {
  ownerId: string;
  /** 期間開始（これ以降に終了するイベント） */
  from?: Date;
  /** 期間終了（これ以前に開始するイベント） */
  to?: Date;
  include?: EventIncludeOptions;
}

/**
 * 指定期間のイベント一覧を取得
 * カレンダー表示用
 */
export async function listEvents(
  input: ListEventsInput
): Promise<Event[]> {
  const where: any = {
    note: {
      ownerId: input.ownerId,
      deletedAt: null, // 削除されたノートのイベントは除外
    },
  };

  // 期間フィルタ
  // イベントの期間が、指定期間と重なるものを取得
  // (Event.startAt <= to) AND (Event.endAt >= from)
  if (input.from || input.to) {
    where.AND = [];
    if (input.to) {
      where.AND.push({
        startAt: { lte: input.to },
      });
    }
    if (input.from) {
      where.AND.push({
        endAt: { gte: input.from },
      });
    }
  }

  return eventsRepository.findMany(
    where,
    { sortBy: "startAt", sortOrder: "asc" },
    input.include
  );
}

/**
 * イベント詳細取得
 */
export async function getEventById(
  id: string,
  ownerId: string,
  include?: EventIncludeOptions
): Promise<Event> {
  const event = await eventsRepository.findById(id, {
    ...include,
    note: true, // 所有者チェックのためにNoteを取得
  });

  if (!event) {
    throw new ServiceError("イベントが見つかりません", "NOT_FOUND");
  }

  // 所有者チェック
  // include.note が false でも、リポジトリの実装によっては note が取れないかもしれないので
  // findById で強制的に note: true にしているが、型定義上 note があるとは限らない
  // Prisma の型推論に頼るか、any で回避するか
  const note = (event as any).note;
  if (!note || note.ownerId !== ownerId) {
    throw new ServiceError("イベントが見つかりません", "NOT_FOUND");
  }

  return event;
}

/**
 * イベント更新の入力
 */
export interface UpdateEventInput {
  startAt?: Date;
  endAt?: Date;
  isAllDay?: boolean;
  location?: string | null;
  recurrenceRule?: string | null;
  metadata?: any;
}

/**
 * イベントを更新
 */
export async function updateEvent(
  id: string,
  ownerId: string,
  input: UpdateEventInput
): Promise<Event> {
  // 所有者チェック
  await getEventById(id, ownerId);

  // 更新
  return eventsRepository.updateById(id, input);
}

/**
 * イベントを削除
 */
export async function deleteEvent(
  id: string,
  ownerId: string
): Promise<void> {
  // 所有者チェック
  await getEventById(id, ownerId);

  // 削除
  await eventsRepository.deleteById(id);
}
