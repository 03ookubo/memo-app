/**
 * Note Delete Service
 * ノートのソフトデリート・復元・物理削除
 *
 * 要件対応:
 * - Tier1: 基本CRUD（削除はソフトデリート）
 * - Tier1: UX/操作性重視（ゴミ箱から復元可能）
 * - data-model.md: Noteはソフト削除、子リソースは物理削除時にアプリで制御
 */

import { Note } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  notesRepository,
  noteTagsRepository,
  attachmentsRepository,
  tasksRepository,
} from "@/server/repositories";
import { ServiceError } from "../types";
import { getNoteById } from "./note.read.service";

/**
 * ノートをソフトデリート（ゴミ箱へ移動）
 */
export async function softDeleteNote(
  id: string,
  ownerId: string
): Promise<Note> {
  const note = await getNoteById(id, ownerId);

  // 既に削除済み
  if (note.deletedAt) {
    throw new ServiceError("このノートは既に削除されています", "CONFLICT", {
      id,
    });
  }

  return notesRepository.updateById(id, { deletedAt: new Date() });
}

/**
 * ノートを復元（ゴミ箱から戻す）
 * 復元時にアーカイブ状態も解除
 */
export async function restoreNote(id: string, ownerId: string): Promise<Note> {
  const note = await getNoteById(id, ownerId);

  // 削除されていない
  if (!note.deletedAt) {
    throw new ServiceError("このノートは削除されていません", "CONFLICT", {
      id,
    });
  }

  // 復元時にアーカイブも解除
  return notesRepository.updateById(id, {
    deletedAt: null,
    archivedAt: null,
  });
}

/**
 * ノートを物理削除（完全に削除）
 * 関連リソース（タグ紐付け、添付、タスク）も削除
 *
 * 注意: data-model.mdに従い、子ノートのparentIdはSetNullで独立化される（Prismaスキーマで設定済み）
 */
export async function hardDeleteNote(
  id: string,
  ownerId: string
): Promise<void> {
  // 権限チェック
  await getNoteById(id, ownerId);

  await prisma.$transaction(async (tx) => {
    // 1. タグ紐付けを削除
    await noteTagsRepository.deleteByNoteId(id, tx);

    // 2. 添付ファイルを削除
    // TODO: ストレージからの実ファイル削除はここでは行わない（別途バッチ処理等で対応）
    await attachmentsRepository.deleteByNoteId(id, tx);

    // 3. タスクを削除（Cascade設定があるが明示的に削除）
    const task = await tasksRepository.findByNoteId(id, undefined, tx);
    if (task) {
      await tasksRepository.deleteByNoteId(id, tx);
    }

    // 4. ノート本体を削除
    // 子ノートのparentIdはPrismaのonDelete: SetNullで自動的にnullになる
    await notesRepository.deleteById(id, tx);
  });
}

/**
 * 複数ノートを一括ソフトデリート
 */
export async function softDeleteNotes(
  ids: string[],
  ownerId: string
): Promise<Note[]> {
  const results: Note[] = [];

  for (const id of ids) {
    try {
      const note = await softDeleteNote(id, ownerId);
      results.push(note);
    } catch (error) {
      if (!(error instanceof ServiceError)) {
        throw error;
      }
    }
  }

  return results;
}

/**
 * 複数ノートを一括復元
 */
export async function restoreNotes(
  ids: string[],
  ownerId: string
): Promise<Note[]> {
  const results: Note[] = [];

  for (const id of ids) {
    try {
      const note = await restoreNote(id, ownerId);
      results.push(note);
    } catch (error) {
      if (!(error instanceof ServiceError)) {
        throw error;
      }
    }
  }

  return results;
}

/**
 * ゴミ箱を空にする（削除済みノートを全て物理削除）
 */
export async function emptyTrash(ownerId: string): Promise<number> {
  const deletedNotes = await notesRepository.findMany({
    ownerId,
    deletedAt: { not: null },
  });

  let deletedCount = 0;

  for (const note of deletedNotes) {
    try {
      await hardDeleteNote(note.id, ownerId);
      deletedCount++;
    } catch (error) {
      // 個別のエラーは無視して続行
      if (!(error instanceof ServiceError)) {
        throw error;
      }
    }
  }

  return deletedCount;
}
