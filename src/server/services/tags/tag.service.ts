/**
 * Tag Service
 * タグのCRUD・削除操作
 *
 * 要件対応:
 * - Tier1: タグによるメモ整理
 * - data-model.md: scopeはSYSTEM/USER、SYSTEMはDB初期化時に作成
 * - @@unique([scope, name, ownerId]) と @@unique([scope, color, ownerId]) で一意性保証
 */

import { Tag, TagScope } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  tagsRepository,
  noteTagsRepository,
  TagSortOptions,
} from "@/server/repositories";
import {
  ServiceError,
  PaginationInput,
  PaginatedResult,
  normalizePagination,
  buildPaginatedResult,
} from "../types";

/**
 * タグ一覧取得の入力
 */
export interface ListTagsInput {
  ownerId?: string;
  pagination?: PaginationInput;
  sort?: TagSortOptions;
  scope?: TagScope;
}

/**
 * タグ作成の入力
 */
export interface CreateTagInput {
  ownerId: string;
  name: string;
  color: string;
  description?: string;
}

/**
 * タグ更新の入力
 */
export interface UpdateTagInput {
  name?: string;
  color?: string;
  description?: string | null;
}

/**
 * タグ一覧を取得
 */
export async function listTags(
  input: ListTagsInput
): Promise<PaginatedResult<Tag>> {
  const { page, limit, skip } = normalizePagination(input.pagination);

  const where: Record<string, unknown> = {};
  if (input.scope) {
    where.scope = input.scope;
  }
  if (input.ownerId) {
    where.ownerId = input.ownerId;
  }

  const [tags, total] = await Promise.all([
    tagsRepository.findMany(where, { take: limit, skip, ...input.sort }),
    tagsRepository.count(where),
  ]);

  return buildPaginatedResult(tags, total, page, limit);
}

/**
 * ユーザータグのみ一覧を取得
 */
export async function listUserTags(
  ownerId: string,
  pagination?: PaginationInput,
  sort?: TagSortOptions
): Promise<PaginatedResult<Tag>> {
  return listTags({ ownerId, pagination, sort, scope: "USER" });
}

/**
 * システムタグのみ一覧を取得
 */
export async function listSystemTags(
  pagination?: PaginationInput,
  sort?: TagSortOptions
): Promise<PaginatedResult<Tag>> {
  return listTags({ pagination, sort, scope: "SYSTEM" });
}

/**
 * タグ詳細を取得
 */
export async function getTagById(id: string): Promise<Tag> {
  const tag = await tagsRepository.findById(id);

  if (!tag) {
    throw new ServiceError("タグが見つかりません", "NOT_FOUND", { id });
  }

  return tag;
}

/**
 * 名前でタグを検索（USERスコープ）
 */
export async function findTagByName(
  ownerId: string,
  name: string
): Promise<Tag | null> {
  return tagsRepository.findByScopeAndName("USER", name, ownerId);
}

/**
 * ユーザータグを作成
 * 同一スコープ・オーナー内で名前・色の重複チェック
 */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  // 名前の重複チェック（USERスコープ・同一オーナー内）
  const existingByName = await tagsRepository.findByScopeAndName(
    "USER",
    input.name,
    input.ownerId
  );

  if (existingByName) {
    throw new ServiceError("同じ名前のタグが既に存在します", "ALREADY_EXISTS", {
      name: input.name,
    });
  }

  // 色の重複チェック（USERスコープ・同一オーナー内）
  const existingByColor = await tagsRepository.findByScopeAndColor(
    "USER",
    input.color,
    input.ownerId
  );

  if (existingByColor) {
    throw new ServiceError("同じ色のタグが既に存在します", "ALREADY_EXISTS", {
      color: input.color,
    });
  }

  return tagsRepository.create({
    scope: "USER",
    name: input.name,
    color: input.color,
    description: input.description,
    owner: { connect: { id: input.ownerId } },
  });
}

/**
 * タグを更新（USERスコープのみ）
 */
export async function updateTag(
  id: string,
  input: UpdateTagInput
): Promise<Tag> {
  const tag = await getTagById(id);

  // SYSTEMタグは編集不可
  if (tag.scope === "SYSTEM") {
    throw new ServiceError(
      "システムタグは編集できません",
      "PERMISSION_DENIED",
      { id }
    );
  }

  // 名前変更時は重複チェック
  if (input.name && input.name !== tag.name && tag.ownerId) {
    const existingByName = await tagsRepository.findByScopeAndName(
      "USER",
      input.name,
      tag.ownerId
    );

    if (existingByName) {
      throw new ServiceError(
        "同じ名前のタグが既に存在します",
        "ALREADY_EXISTS",
        {
          name: input.name,
        }
      );
    }
  }

  // 色変更時は重複チェック
  if (input.color && input.color !== tag.color && tag.ownerId) {
    const existingByColor = await tagsRepository.findByScopeAndColor(
      "USER",
      input.color,
      tag.ownerId
    );

    if (existingByColor) {
      throw new ServiceError("同じ色のタグが既に存在します", "ALREADY_EXISTS", {
        color: input.color,
      });
    }
  }

  return tagsRepository.updateById(id, {
    name: input.name,
    color: input.color,
    description: input.description,
  });
}

/**
 * タグを削除（USERスコープのみ）
 * 関連するNoteTagも削除
 */
export async function deleteTag(id: string): Promise<void> {
  const tag = await getTagById(id);

  // SYSTEMタグは削除不可
  if (tag.scope === "SYSTEM") {
    throw new ServiceError(
      "システムタグは削除できません",
      "PERMISSION_DENIED",
      { id }
    );
  }

  await prisma.$transaction(async (tx) => {
    // 関連するNoteTagを削除
    await noteTagsRepository.deleteByTagId(id, tx);

    // タグを削除
    await tagsRepository.deleteById(id, tx);
  });
}

/**
 * タグに紐づくノート数を取得
 */
export async function getTagNoteCount(id: string): Promise<number> {
  await getTagById(id);

  return noteTagsRepository.countByTagId(id);
}

/**
 * ノートにタグを追加
 */
export async function addTagToNote(
  noteId: string,
  tagId: string
): Promise<void> {
  await getTagById(tagId);

  // 既存チェック
  const existing = await noteTagsRepository.findByNoteIdAndTagId(noteId, tagId);

  if (existing) {
    throw new ServiceError(
      "このノートには既にこのタグが付いています",
      "ALREADY_EXISTS",
      { noteId, tagId }
    );
  }

  await noteTagsRepository.create({ noteId, tagId });
}

/**
 * ノートからタグを削除
 */
export async function removeTagFromNote(
  noteId: string,
  tagId: string
): Promise<void> {
  const noteTag = await noteTagsRepository.findByNoteIdAndTagId(noteId, tagId);

  if (!noteTag) {
    throw new ServiceError(
      "このノートにはこのタグが付いていません",
      "NOT_FOUND",
      { noteId, tagId }
    );
  }

  await noteTagsRepository.delete({ noteId, tagId });
}

/**
 * ノートの全タグを取得
 */
export async function getTagsForNote(noteId: string): Promise<Tag[]> {
  const noteTags = await noteTagsRepository.findByNoteId(noteId);
  // noteTagsRepository.findByNoteIdはinclude: { tag: true }で取得
  return noteTags
    .map((nt) => (nt as unknown as { tag: Tag }).tag)
    .filter((t): t is Tag => t !== undefined);
}

/**
 * ノートのタグを一括設定（既存を置換）
 */
export async function setTagsForNote(
  noteId: string,
  tagIds: string[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 既存のNoteTagを全削除
    await noteTagsRepository.deleteByNoteId(noteId, tx);

    // 新しいタグを一括追加
    if (tagIds.length > 0) {
      await noteTagsRepository.createMany(noteId, tagIds, tx);
    }
  });
}
