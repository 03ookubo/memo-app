/**
 * Project Service
 * プロジェクトのCRUD・アーカイブ・削除操作
 *
 * 要件対応:
 * - Tier2: プロジェクト（必要に応じて有効化）
 * - data-model.md: @@unique([ownerId, name])で同一ユーザー内で名前重複防止
 */

import { Project } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  projectsRepository,
  notesRepository,
  ProjectIncludeOptions,
  ProjectSortOptions,
} from "@/server/repositories";
import {
  ServiceError,
  PaginationInput,
  PaginatedResult,
  normalizePagination,
  buildPaginatedResult,
} from "../types";

/**
 * プロジェクト一覧取得の入力
 */
export interface ListProjectsInput {
  ownerId: string;
  pagination?: PaginationInput;
  sort?: ProjectSortOptions;
  include?: ProjectIncludeOptions;
}

/**
 * プロジェクト作成の入力
 */
export interface CreateProjectInput {
  ownerId: string;
  name: string;
  description?: string;
  emoji?: string;
  sortIndex?: number;
}

/**
 * プロジェクト更新の入力
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  emoji?: string | null;
  sortIndex?: number;
}

/**
 * アクティブなプロジェクト一覧を取得
 */
export async function listActiveProjects(
  input: ListProjectsInput
): Promise<PaginatedResult<Project>> {
  const { page, limit, skip } = normalizePagination(input.pagination);

  const where = {
    ownerId: input.ownerId,
    deletedAt: null,
    archivedAt: null,
  };

  const [projects, total] = await Promise.all([
    projectsRepository.findMany(
      where,
      { take: limit, skip, ...input.sort },
      input.include
    ),
    projectsRepository.count(where),
  ]);

  return buildPaginatedResult(projects, total, page, limit);
}

/**
 * アーカイブ済みプロジェクト一覧を取得
 */
export async function listArchivedProjects(
  input: ListProjectsInput
): Promise<PaginatedResult<Project>> {
  const { page, limit, skip } = normalizePagination(input.pagination);

  const where = {
    ownerId: input.ownerId,
    deletedAt: null,
    archivedAt: { not: null },
  };

  const [projects, total] = await Promise.all([
    projectsRepository.findMany(
      where,
      { take: limit, skip, ...input.sort },
      input.include
    ),
    projectsRepository.count(where),
  ]);

  return buildPaginatedResult(projects, total, page, limit);
}

/**
 * 削除済み（ゴミ箱）プロジェクト一覧を取得
 */
export async function listDeletedProjects(
  input: ListProjectsInput
): Promise<PaginatedResult<Project>> {
  const { page, limit, skip } = normalizePagination(input.pagination);

  const where = {
    ownerId: input.ownerId,
    deletedAt: { not: null },
  };

  const [projects, total] = await Promise.all([
    projectsRepository.findMany(
      where,
      { take: limit, skip, sortBy: "updatedAt", sortOrder: "desc" },
      input.include
    ),
    projectsRepository.count(where),
  ]);

  return buildPaginatedResult(projects, total, page, limit);
}

/**
 * プロジェクト詳細を取得
 */
export async function getProjectById(
  id: string,
  ownerId: string,
  include?: ProjectIncludeOptions
): Promise<Project> {
  const project = await projectsRepository.findById(id, include);

  if (!project) {
    throw new ServiceError("プロジェクトが見つかりません", "NOT_FOUND", { id });
  }

  if (project.ownerId !== ownerId) {
    throw new ServiceError(
      "このプロジェクトにアクセスする権限がありません",
      "PERMISSION_DENIED",
      { id }
    );
  }

  return project;
}

/**
 * プロジェクトを作成
 * 同一オーナー内で名前の重複チェック
 */
export async function createProject(
  input: CreateProjectInput
): Promise<Project> {
  // 名前の重複チェック
  const existing = await projectsRepository.findByOwnerIdAndName(
    input.ownerId,
    input.name
  );

  if (existing) {
    throw new ServiceError(
      "同じ名前のプロジェクトが既に存在します",
      "ALREADY_EXISTS",
      { name: input.name }
    );
  }

  return projectsRepository.create({
    name: input.name,
    description: input.description,
    emoji: input.emoji,
    sortIndex: input.sortIndex ?? 0,
    owner: { connect: { id: input.ownerId } },
  });
}

/**
 * プロジェクトを更新
 */
export async function updateProject(
  id: string,
  ownerId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const project = await getProjectById(id, ownerId);

  // 名前変更時は重複チェック
  if (input.name && input.name !== project.name) {
    const existing = await projectsRepository.findByOwnerIdAndName(
      ownerId,
      input.name
    );

    if (existing) {
      throw new ServiceError(
        "同じ名前のプロジェクトが既に存在します",
        "ALREADY_EXISTS",
        { name: input.name }
      );
    }
  }

  return projectsRepository.updateById(id, {
    name: input.name,
    description: input.description,
    emoji: input.emoji,
    sortIndex: input.sortIndex,
  });
}

/**
 * プロジェクトをアーカイブ
 */
export async function archiveProject(
  id: string,
  ownerId: string
): Promise<Project> {
  const project = await getProjectById(id, ownerId);

  if (project.archivedAt) {
    throw new ServiceError(
      "このプロジェクトは既にアーカイブされています",
      "CONFLICT",
      { id }
    );
  }

  if (project.deletedAt) {
    throw new ServiceError(
      "削除済みのプロジェクトはアーカイブできません",
      "CONFLICT",
      { id }
    );
  }

  return projectsRepository.updateById(id, { archivedAt: new Date() });
}

/**
 * プロジェクトのアーカイブを解除
 */
export async function unarchiveProject(
  id: string,
  ownerId: string
): Promise<Project> {
  const project = await getProjectById(id, ownerId);

  if (!project.archivedAt) {
    throw new ServiceError(
      "このプロジェクトはアーカイブされていません",
      "CONFLICT",
      { id }
    );
  }

  return projectsRepository.updateById(id, { archivedAt: null });
}

/**
 * プロジェクトをソフトデリート
 */
export async function softDeleteProject(
  id: string,
  ownerId: string
): Promise<Project> {
  const project = await getProjectById(id, ownerId);

  if (project.deletedAt) {
    throw new ServiceError(
      "このプロジェクトは既に削除されています",
      "CONFLICT",
      { id }
    );
  }

  return projectsRepository.updateById(id, { deletedAt: new Date() });
}

/**
 * プロジェクトを復元
 */
export async function restoreProject(
  id: string,
  ownerId: string
): Promise<Project> {
  const project = await getProjectById(id, ownerId);

  if (!project.deletedAt) {
    throw new ServiceError("このプロジェクトは削除されていません", "CONFLICT", {
      id,
    });
  }

  return projectsRepository.updateById(id, {
    deletedAt: null,
    archivedAt: null,
  });
}

/**
 * プロジェクトを物理削除
 * 所属ノートのprojectIdはnullになる
 */
export async function hardDeleteProject(
  id: string,
  ownerId: string
): Promise<void> {
  await getProjectById(id, ownerId);

  await prisma.$transaction(async (tx) => {
    // ノートのprojectIdをnullに設定
    await tx.note.updateMany({
      where: { projectId: id },
      data: { projectId: null },
    });

    // プロジェクトを削除
    await projectsRepository.deleteById(id, tx);
  });
}

/**
 * プロジェクトに所属するノート数を取得
 */
export async function getProjectNoteCount(
  id: string,
  ownerId: string
): Promise<number> {
  await getProjectById(id, ownerId);

  return notesRepository.count({
    projectId: id,
    deletedAt: null,
  });
}
