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
  sortIndex?: number;
  /** 紐付けるタグID一覧 */
  tagIds?: string[];
  /** タスクとして作成する場合の設定 */
  task?: {
    dueAt?: Date;
    priority?: number;
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
  sortIndex?: number;
  /** タグIDを同期（指定されたタグのみ紐付け） */
  tagIds?: string[];
}

/**
 * ノートを作成
 * タグ・タスクがある場合はトランザクションで一括作成
 */
export async function createNote(
  input: CreateNoteInput,
  include?: NoteIncludeOptions
): Promise<Note> {
  const { tagIds, task, ...noteData } = input;

  // タグまたはタスクがある場合はトランザクション
  if ((tagIds && tagIds.length > 0) || task) {
    return prisma.$transaction(async (tx) => {
      // 1. ノート作成
      const note = await notesRepository.create(
        {
          title: noteData.title,
          bodyMarkdown: noteData.bodyMarkdown,
          bodyHtml: noteData.bodyHtml,
          metadata: noteData.metadata,
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
          },
          tx
        );
      }

      // 4. 関連データを含めて再取得
      if (include) {
        return notesRepository.findById(note.id, include, tx) as Promise<Note>;
      }

      return note;
    });
  }

  // タグ・タスクがない場合は単純作成
  return notesRepository.create({
    title: noteData.title,
    bodyMarkdown: noteData.bodyMarkdown,
    bodyHtml: noteData.bodyHtml,
    metadata: noteData.metadata,
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
 * タグの同期がある場合はトランザクション
 */
export async function updateNote(
  id: string,
  ownerId: string,
  input: UpdateNoteInput,
  include?: NoteIncludeOptions
): Promise<Note> {
  // 権限チェック
  await getNoteById(id, ownerId);

  const { tagIds, ...updateData } = input;

  // タグ同期がある場合はトランザクション
  if (tagIds !== undefined) {
    return prisma.$transaction(async (tx) => {
      // 1. ノート更新
      await notesRepository.updateById(
        id,
        {
          title: updateData.title,
          bodyMarkdown: updateData.bodyMarkdown,
          bodyHtml: updateData.bodyHtml,
          metadata: updateData.metadata,
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
      await noteTagsRepository.deleteByNoteId(id, tx);
      if (tagIds.length > 0) {
        await noteTagsRepository.createMany(id, tagIds, tx);
      }

      // 3. 関連データを含めて再取得
      return notesRepository.findById(id, include, tx) as Promise<Note>;
    });
  }

  // タグ同期がない場合は単純更新
  const updated = await notesRepository.updateById(id, {
    title: updateData.title,
    bodyMarkdown: updateData.bodyMarkdown,
    bodyHtml: updateData.bodyHtml,
    metadata: updateData.metadata,
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
