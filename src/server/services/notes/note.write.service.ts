/**
 * Note Write Service
 * ノートの作成・更新操作
 * タグ・タスクとの連携をトランザクションで制御
 *
 * 要件対応:
 * - Tier1: 基本CRUD（作成・更新）
 * - Tier1: タグの複数紐付け
 * - Tier2: 期限・優先度（Task連携）
 * - Tier2: サブタスク（親子関係）
 */

import { Note, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  notesRepository,
  noteTagsRepository,
  tasksRepository,
  eventsRepository,
  NoteIncludeOptions,
} from "@/server/repositories";
import { ServiceError } from "../types";
import { getNoteById } from "./note.read.service";

/**
 * ノート作成の入力
 */
export interface CreateNoteInput {
  ownerId: string;
  title?: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  projectId?: string;
  parentId?: string;
  metadata?: Prisma.InputJsonValue;
  isEncrypted?: boolean;
  sortIndex?: number;
  /** 紐付けるタグID一覧 */
  tagIds?: string[];
  /** タスクとして作成する場合の設定 */
  task?: {
    dueAt?: Date;
    priority?: number;
    recurrenceRule?: string;
    metadata?: Prisma.InputJsonValue;
  };
  /** イベントとして作成する場合の設定 */
  event?: {
    startAt: Date;
    endAt: Date;
    isAllDay?: boolean;
    location?: string;
    recurrenceRule?: string;
    metadata?: Prisma.InputJsonValue;
  };
}

/**
 * ノート更新の入力
 */
export interface UpdateNoteInput {
  title?: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  projectId?: string | null;
  parentId?: string | null;
  metadata?: Prisma.InputJsonValue;
  isEncrypted?: boolean;
  sortIndex?: number;
  /** タグIDを同期（指定されたタグのみ紐付け） */
  tagIds?: string[];
  /** タスク情報の更新 */
  task?: {
    dueAt?: Date | null;
    priority?: number | null;
    completedAt?: Date | null;
    recurrenceRule?: string | null;
    metadata?: Prisma.InputJsonValue;
  } | null;
  /** イベント情報の更新 */
  event?: {
    startAt?: Date;
    endAt?: Date;
    isAllDay?: boolean;
    location?: string | null;
    recurrenceRule?: string | null;
    metadata?: Prisma.InputJsonValue;
  } | null;
}

/**
 * ノートを作成
 * タグ・タスク・イベントがある場合はトランザクションで一括作成
 */
export async function createNote(
  input: CreateNoteInput,
  include?: NoteIncludeOptions
): Promise<Note> {
  const { tagIds, task, event, ...noteData } = input;

  // タグ、タスク、イベントがある場合はトランザクション
  if ((tagIds && tagIds.length > 0) || task || event) {
    return prisma.$transaction(async (tx) => {
      // 1. ノート作成
      const note = await notesRepository.create(
        {
          title: noteData.title,
          bodyMarkdown: noteData.bodyMarkdown,
          bodyHtml: noteData.bodyHtml,
          metadata: noteData.metadata,
          isEncrypted: noteData.isEncrypted ?? false,
          sortIndex: noteData.sortIndex ?? 0,
          owner: { connect: { id: noteData.ownerId } },
          project: noteData.projectId
            ? { connect: { id: noteData.projectId } }
            : undefined,
          parent: noteData.parentId
            ? { connect: { id: noteData.parentId } }
            : undefined,
        },
        tx
      );

      // 2. タグ紐付け
      if (tagIds && tagIds.length > 0) {
        await noteTagsRepository.createMany(note.id, tagIds, tx);
      }

      // 3. タスク作成
      if (task) {
        await tasksRepository.create(
          {
            note: { connect: { id: note.id } },
            dueAt: task.dueAt,
            priority: task.priority,
            recurrenceRule: task.recurrenceRule,
            metadata: task.metadata,
          },
          tx
        );
      }

      // 4. イベント作成
      if (event) {
        await eventsRepository.create(
          {
            note: { connect: { id: note.id } },
            startAt: event.startAt,
            endAt: event.endAt,
            isAllDay: event.isAllDay ?? false,
            location: event.location,
            recurrenceRule: event.recurrenceRule,
            metadata: event.metadata,
          },
          tx
        );
      }

      // 5. 関連データを含めて再取得
      if (include) {
        return notesRepository.findById(note.id, include, tx) as Promise<Note>;
      }

      return note;
    });
  }

  // 単純作成
  return notesRepository.create({
    title: noteData.title,
    bodyMarkdown: noteData.bodyMarkdown,
    bodyHtml: noteData.bodyHtml,
    metadata: noteData.metadata,
    isEncrypted: noteData.isEncrypted ?? false,
    sortIndex: noteData.sortIndex ?? 0,
    owner: { connect: { id: noteData.ownerId } },
    project: noteData.projectId
      ? { connect: { id: noteData.projectId } }
      : undefined,
    parent: noteData.parentId
      ? { connect: { id: noteData.parentId } }
      : undefined,
  });
}

/**
 * ノートを更新
 * タグ・タスク・イベントの同期がある場合はトランザクション
 */
export async function updateNote(
  id: string,
  ownerId: string,
  input: UpdateNoteInput,
  include?: NoteIncludeOptions
): Promise<Note> {
  // 権限チェック
  const currentNote = await getNoteById(id, ownerId, {
    task: true,
    event: true,
  });

  const { tagIds, task, event, ...updateData } = input;

  // 関連データの更新がある場合はトランザクション
  if (
    tagIds !== undefined ||
    task !== undefined ||
    event !== undefined
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. ノート更新
      await notesRepository.updateById(
        id,
        {
          title: updateData.title,
          bodyMarkdown: updateData.bodyMarkdown,
          bodyHtml: updateData.bodyHtml,
          metadata: updateData.metadata,
          isEncrypted: updateData.isEncrypted,
          sortIndex: updateData.sortIndex,
          project:
            updateData.projectId === null
              ? { disconnect: true }
              : updateData.projectId
              ? { connect: { id: updateData.projectId } }
              : undefined,
          parent:
            updateData.parentId === null
              ? { disconnect: true }
              : updateData.parentId
              ? { connect: { id: updateData.parentId } }
              : undefined,
        },
        tx
      );

      // 2. タグを同期（既存削除 → 新規追加）
      if (tagIds !== undefined) {
        await noteTagsRepository.deleteByNoteId(id, tx);
        if (tagIds.length > 0) {
          await noteTagsRepository.createMany(id, tagIds, tx);
        }
      }

      // 3. タスク更新
      if (task !== undefined) {
        if (task === null) {
          // 削除
          if ((currentNote as any).task) {
            await tasksRepository.deleteByNoteId(id, tx);
          }
        } else {
          // 作成または更新
          if ((currentNote as any).task) {
            await tasksRepository.updateByNoteId(
              id,
              {
                dueAt: task.dueAt,
                priority: task.priority,
                completedAt: task.completedAt,
                recurrenceRule: task.recurrenceRule,
                metadata: task.metadata ?? undefined,
              },
              tx
            );
          } else {
            await tasksRepository.create(
              {
                note: { connect: { id } },
                dueAt: task.dueAt,
                priority: task.priority,
                recurrenceRule: task.recurrenceRule,
                metadata: task.metadata ?? undefined,
              },
              tx
            );
          }
        }
      }

      // 4. イベント更新
      if (event !== undefined) {
        if (event === null) {
          // 削除
          if ((currentNote as any).event) {
            await eventsRepository.deleteByNoteId(id, tx);
          }
        } else {
          // 作成または更新
          if ((currentNote as any).event) {
            await eventsRepository.updateByNoteId(
              id,
              {
                startAt: event.startAt,
                endAt: event.endAt,
                isAllDay: event.isAllDay,
                location: event.location,
                recurrenceRule: event.recurrenceRule,
                metadata: event.metadata ?? undefined,
              },
              tx
            );
          } else {
            // 必須項目のチェック
            if (!event.startAt || !event.endAt) {
              throw new ServiceError(
                "イベント作成には開始・終了日時が必要です",
                "VALIDATION_ERROR"
              );
            }
            await eventsRepository.create(
              {
                note: { connect: { id } },
                startAt: event.startAt,
                endAt: event.endAt,
                isAllDay: event.isAllDay ?? false,
                location: event.location,
                recurrenceRule: event.recurrenceRule,
                metadata: event.metadata ?? undefined,
              },
              tx
            );
          }
        }
      }

      // 5. 関連データを含めて再取得
      return notesRepository.findById(id, include, tx) as Promise<Note>;
    });
  }

  // 単純更新
  const updated = await notesRepository.updateById(id, {
    title: updateData.title,
    bodyMarkdown: updateData.bodyMarkdown,
    bodyHtml: updateData.bodyHtml,
    metadata: updateData.metadata,
    isEncrypted: updateData.isEncrypted,
    sortIndex: updateData.sortIndex,
    project:
      updateData.projectId === null
        ? { disconnect: true }
        : updateData.projectId
        ? { connect: { id: updateData.projectId } }
        : undefined,
    parent:
      updateData.parentId === null
        ? { disconnect: true }
        : updateData.parentId
        ? { connect: { id: updateData.parentId } }
        : undefined,
  });

  if (include) {
    return notesRepository.findById(id, include) as Promise<Note>;
  }

  return updated;
}

/**
 * ノートにタスクを追加（既存ノートをTodo化）
 */
export async function addTaskToNote(
  noteId: string,
  ownerId: string,
  task: { dueAt?: Date; priority?: number }
): Promise<Note> {
  // 権限チェック
  const note = await getNoteById(noteId, ownerId, { task: true });

  // 既にタスクがある場合はエラー
  if ((note as Note & { task?: unknown }).task) {
    throw new ServiceError(
      "このノートには既にタスクが設定されています",
      "ALREADY_EXISTS",
      { noteId }
    );
  }

  await tasksRepository.create({
    note: { connect: { id: noteId } },
    dueAt: task.dueAt,
    priority: task.priority,
  });

  return notesRepository.findById(noteId, { task: true }) as Promise<Note>;
}

/**
 * ノートからタスクを削除（Todoを解除）
 */
export async function removeTaskFromNote(
  noteId: string,
  ownerId: string
): Promise<Note> {
  // 権限チェック
  const note = await getNoteById(noteId, ownerId, { task: true });

  // タスクがない場合はエラー
  if (!(note as Note & { task?: unknown }).task) {
    throw new ServiceError(
      "このノートにはタスクが設定されていません",
      "NOT_FOUND",
      { noteId }
    );
  }

  await tasksRepository.deleteByNoteId(noteId);

  return notesRepository.findById(noteId, { task: true }) as Promise<Note>;
}

/**
 * ノートの並び順を更新
 */
export async function updateNoteSortIndex(
  id: string,
  ownerId: string,
  sortIndex: number
): Promise<Note> {
  await getNoteById(id, ownerId);
  return notesRepository.updateById(id, { sortIndex });
}
