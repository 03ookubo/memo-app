/**
 * Task Service
 * タスクのCRUD・完了/未完了操作
 *
 * 要件対応:
 * - Tier1: ノートに紐づく簡単なTODO
 * - data-model.md: Note.id -> Task.noteId (1:1)
 * - NoteとTaskは1対1の関係、Taskはノートのサブタイプとして機能
 */

import { Task } from "@prisma/client";
import { tasksRepository, TaskSortOptions } from "@/server/repositories";
import {
  ServiceError,
  PaginationInput,
  PaginatedResult,
  normalizePagination,
  buildPaginatedResult,
} from "../types";

/**
 * タスク一覧取得の入力
 */
export interface ListTasksInput {
  pagination?: PaginationInput;
  sort?: TaskSortOptions;
  isCompleted?: boolean;
}

/**
 * タスク作成の入力
 */
export interface CreateTaskInput {
  noteId: string;
  dueAt?: Date;
  priority?: number;
}

/**
 * タスク更新の入力
 */
export interface UpdateTaskInput {
  dueAt?: Date | null;
  priority?: number | null;
}

/**
 * タスク一覧を取得（完了/未完了でフィルタ可能）
 */
export async function listTasks(
  input: ListTasksInput
): Promise<PaginatedResult<Task>> {
  const { page, limit, skip } = normalizePagination(input.pagination);

  const where: Parameters<typeof tasksRepository.findMany>[0] = {};

  if (input.isCompleted !== undefined) {
    where.completedAt = input.isCompleted ? { not: null } : null;
  }

  const [tasks, total] = await Promise.all([
    tasksRepository.findMany(where, { take: limit, skip, ...input.sort }),
    tasksRepository.count(where),
  ]);

  return buildPaginatedResult(tasks, total, page, limit);
}

/**
 * 未完了タスクのみ取得
 */
export async function listUncompletedTasks(
  pagination?: PaginationInput,
  sort?: TaskSortOptions
): Promise<PaginatedResult<Task>> {
  return listTasks({ pagination, sort, isCompleted: false });
}

/**
 * 完了済みタスクのみ取得
 */
export async function listCompletedTasks(
  pagination?: PaginationInput,
  sort?: TaskSortOptions
): Promise<PaginatedResult<Task>> {
  return listTasks({ pagination, sort, isCompleted: true });
}

/**
 * タスク詳細を取得
 */
export async function getTaskById(id: string): Promise<Task> {
  const task = await tasksRepository.findById(id);

  if (!task) {
    throw new ServiceError("タスクが見つかりません", "NOT_FOUND", { id });
  }

  return task;
}

/**
 * ノートIDでタスクを取得
 */
export async function getTaskByNoteId(noteId: string): Promise<Task | null> {
  return tasksRepository.findByNoteId(noteId);
}

/**
 * タスクを作成（ノートにタスク情報を付加）
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  // 既存チェック（1:1なので既にあればエラー）
  const existing = await tasksRepository.findByNoteId(input.noteId);

  if (existing) {
    throw new ServiceError(
      "このノートには既にタスクが設定されています",
      "ALREADY_EXISTS",
      { noteId: input.noteId }
    );
  }

  return tasksRepository.create({
    note: { connect: { id: input.noteId } },
    dueAt: input.dueAt,
    priority: input.priority,
  });
}

/**
 * タスクを更新
 */
export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<Task> {
  await getTaskById(id);

  return tasksRepository.updateById(id, {
    dueAt: input.dueAt,
    priority: input.priority,
  });
}

/**
 * タスクを完了にする
 */
export async function completeTask(id: string): Promise<Task> {
  const task = await getTaskById(id);

  if (task.completedAt) {
    throw new ServiceError("このタスクは既に完了しています", "CONFLICT", {
      id,
    });
  }

  return tasksRepository.updateById(id, { completedAt: new Date() });
}

/**
 * タスクを未完了に戻す
 */
export async function uncompleteTask(id: string): Promise<Task> {
  const task = await getTaskById(id);

  if (!task.completedAt) {
    throw new ServiceError("このタスクは未完了です", "CONFLICT", { id });
  }

  return tasksRepository.updateById(id, { completedAt: null });
}

/**
 * タスクの完了状態をトグル
 */
export async function toggleTaskCompletion(id: string): Promise<Task> {
  const task = await getTaskById(id);

  if (task.completedAt) {
    return tasksRepository.updateById(id, { completedAt: null });
  } else {
    return tasksRepository.updateById(id, { completedAt: new Date() });
  }
}

/**
 * タスクを削除（ノートからタスク属性を削除）
 */
export async function deleteTask(id: string): Promise<void> {
  await getTaskById(id);
  await tasksRepository.deleteById(id);
}

/**
 * ノートIDでタスクを削除
 */
export async function deleteTaskByNoteId(noteId: string): Promise<void> {
  const task = await tasksRepository.findByNoteId(noteId);
  if (task) {
    await tasksRepository.deleteById(task.id);
  }
}

/**
 * 期限が近いタスクを取得（全ノート横断）
 */
export async function listUpcomingTasks(
  daysAhead: number = 7,
  pagination?: PaginationInput
): Promise<PaginatedResult<Task>> {
  const { page, limit, skip } = normalizePagination(pagination);

  const now = new Date();
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + daysAhead);

  const where = {
    completedAt: null,
    dueAt: {
      gte: now,
      lte: deadline,
    },
  };

  const [tasks, total] = await Promise.all([
    tasksRepository.findMany(where, {
      take: limit,
      skip,
      sortBy: "dueAt",
      sortOrder: "asc",
    }),
    tasksRepository.count(where),
  ]);

  return buildPaginatedResult(tasks, total, page, limit);
}

/**
 * 期限切れタスクを取得（全ノート横断）
 */
export async function listOverdueTasks(
  pagination?: PaginationInput
): Promise<PaginatedResult<Task>> {
  const { page, limit, skip } = normalizePagination(pagination);

  const now = new Date();

  const where = {
    completedAt: null,
    dueAt: {
      lt: now,
    },
  };

  const [tasks, total] = await Promise.all([
    tasksRepository.findMany(where, {
      take: limit,
      skip,
      sortBy: "dueAt",
      sortOrder: "asc",
    }),
    tasksRepository.count(where),
  ]);

  return buildPaginatedResult(tasks, total, page, limit);
}
