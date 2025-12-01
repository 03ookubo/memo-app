/**
 * Note Read Service
 * ノートの読み取り系操作（一覧、詳細取得、検索）
 *
 * 要件対応:
 * - Tier1: 基本CRUD（一覧取得）
 * - Tier1: 基本検索とタグフィルタ
 * - Tier1: UX/操作性重視（アーカイブ・ゴミ箱分離）
 */

import { Note } from "@prisma/client";
import {
  notesRepository,
  NoteIncludeOptions,
  NoteSortOptions,
} from "@/server/repositories";
import {
  ServiceError,
  PaginationInput,
  PaginatedResult,
  normalizePagination,
  buildPaginatedResult,
} from "../types";

/**
 * ノート一覧取得の入力
 */
export interface ListNotesInput {
  ownerId: string;
  pagination?: PaginationInput;
  sort?: NoteSortOptions;
  include?: NoteIncludeOptions;
  /** タグIDでフィルタ */
  tagId?: string;
  /** プロジェクトIDでフィルタ */
  projectId?: string;
  /** 親ノートIDでフィルタ（サブノート取得） */
  parentId?: string | null;
  /** タイトル/本文の部分一致検索 */
  search?: string;
}

/**
 * アクティブなノート一覧を取得
 * - deletedAt = null（ゴミ箱にない）
 * - archivedAt = null（アーカイブされていない）
 */
export async function listActiveNotes(
  input: ListNotesInput
): Promise<PaginatedResult<Note>> {
  const { page, limit, skip } = normalizePagination(input.pagination);

  const where = buildWhereClause(input, { deleted: false, archived: false });

  const [notes, total] = await Promise.all([
    notesRepository.findMany(
      where,
      { take: limit, skip, ...input.sort },
      input.include
    ),
    notesRepository.count(where),
  ]);

  return buildPaginatedResult(notes, total, page, limit);
}

/**
 * アーカイブ済みノート一覧を取得
 */
export async function listArchivedNotes(
  input: ListNotesInput
): Promise<PaginatedResult<Note>> {
  const { page, limit, skip } = normalizePagination(input.pagination);

  const where = buildWhereClause(input, { deleted: false, archived: true });

  const [notes, total] = await Promise.all([
    notesRepository.findMany(
      where,
      { take: limit, skip, ...input.sort },
      input.include
    ),
    notesRepository.count(where),
  ]);

  return buildPaginatedResult(notes, total, page, limit);
}

/**
 * ゴミ箱（削除済み）ノート一覧を取得
 */
export async function listDeletedNotes(
  input: ListNotesInput
): Promise<PaginatedResult<Note>> {
  const { page, limit, skip } = normalizePagination(input.pagination);

  const where = buildWhereClause(input, { deleted: true, archived: null });

  const [notes, total] = await Promise.all([
    notesRepository.findMany(
      where,
      { take: limit, skip, sortBy: "updatedAt", sortOrder: "desc" },
      input.include
    ),
    notesRepository.count(where),
  ]);

  return buildPaginatedResult(notes, total, page, limit);
}

/**
 * ノート詳細を取得
 */
export async function getNoteById(
  id: string,
  ownerId: string,
  include?: NoteIncludeOptions
): Promise<Note> {
  const note = await notesRepository.findById(id, include);

  if (!note) {
    throw new ServiceError("ノートが見つかりません", "NOT_FOUND", { id });
  }

  // 権限チェック
  if (note.ownerId !== ownerId) {
    throw new ServiceError(
      "このノートにアクセスする権限がありません",
      "PERMISSION_DENIED",
      { id }
    );
  }

  return note;
}

/**
 * 子ノート（サブノート/サブタスク）一覧を取得
 */
export async function listChildNotes(
  parentId: string,
  ownerId: string,
  include?: NoteIncludeOptions
): Promise<Note[]> {
  // 親ノートの存在と権限を確認
  await getNoteById(parentId, ownerId);

  return notesRepository.findMany(
    {
      parentId,
      ownerId,
      deletedAt: null,
    },
    { sortBy: "sortIndex", sortOrder: "asc" },
    include
  );
}

/**
 * WHERE句を構築するヘルパー
 */
function buildWhereClause(
  input: ListNotesInput,
  options: { deleted: boolean; archived: boolean | null }
) {
  const where: Record<string, unknown> = {
    ownerId: input.ownerId,
  };

  // 削除状態
  if (options.deleted) {
    where.deletedAt = { not: null };
  } else {
    where.deletedAt = null;
  }

  // アーカイブ状態
  if (options.archived === true) {
    where.archivedAt = { not: null };
  } else if (options.archived === false) {
    where.archivedAt = null;
  }
  // archived === null の場合は条件を追加しない（削除済み一覧用）

  // プロジェクトフィルタ
  if (input.projectId) {
    where.projectId = input.projectId;
  }

  // 親ノートフィルタ
  if (input.parentId !== undefined) {
    where.parentId = input.parentId;
  }

  // タグフィルタ
  if (input.tagId) {
    where.tags = {
      some: { tagId: input.tagId },
    };
  }

  // 検索（タイトル/本文の部分一致）
  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { bodyMarkdown: { contains: input.search, mode: "insensitive" } },
    ];
  }

  return where;
}
