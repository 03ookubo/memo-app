/**
 * Note Archive Service
 * ノートのアーカイブ・アンアーカイブ操作
 *
 * 要件対応:
 * - Tier1: UX/操作性重視（アーカイブで非表示、復元可能）
 */

import { Note } from "@prisma/client";
import { notesRepository } from "@/server/repositories";
import { ServiceError } from "../types";
import { getNoteById } from "./note.read.service";

/**
 * ノートをアーカイブ
 * アーカイブ済み・削除済みのノートはアーカイブ不可
 */
export async function archiveNote(id: string, ownerId: string): Promise<Note> {
  const note = await getNoteById(id, ownerId);

  // 既にアーカイブ済み
  if (note.archivedAt) {
    throw new ServiceError(
      "このノートは既にアーカイブされています",
      "CONFLICT",
      { id }
    );
  }

  // 削除済みノートはアーカイブ不可
  if (note.deletedAt) {
    throw new ServiceError(
      "削除済みのノートはアーカイブできません。先に復元してください",
      "CONFLICT",
      { id }
    );
  }

  return notesRepository.updateById(id, { archivedAt: new Date() });
}

/**
 * ノートのアーカイブを解除
 */
export async function unarchiveNote(
  id: string,
  ownerId: string
): Promise<Note> {
  const note = await getNoteById(id, ownerId);

  // アーカイブされていない
  if (!note.archivedAt) {
    throw new ServiceError("このノートはアーカイブされていません", "CONFLICT", {
      id,
    });
  }

  return notesRepository.updateById(id, { archivedAt: null });
}

/**
 * 複数ノートを一括アーカイブ
 */
export async function archiveNotes(
  ids: string[],
  ownerId: string
): Promise<Note[]> {
  const results: Note[] = [];

  for (const id of ids) {
    try {
      const note = await archiveNote(id, ownerId);
      results.push(note);
    } catch (error) {
      // 個別のエラーは無視して続行（一括操作のため）
      if (!(error instanceof ServiceError)) {
        throw error;
      }
    }
  }

  return results;
}

/**
 * 複数ノートのアーカイブを一括解除
 */
export async function unarchiveNotes(
  ids: string[],
  ownerId: string
): Promise<Note[]> {
  const results: Note[] = [];

  for (const id of ids) {
    try {
      const note = await unarchiveNote(id, ownerId);
      results.push(note);
    } catch (error) {
      if (!(error instanceof ServiceError)) {
        throw error;
      }
    }
  }

  return results;
}
