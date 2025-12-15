/**
 * NoteTag Repository
 * ノートとタグの関連（多対多）の純粋なCRUD操作のみを提供
 * タグ同期等のビジネスロジックはService層で実装
 */

import { Prisma, NoteTag } from "@prisma/client";
import prisma from "@/lib/prisma";
import { TransactionClient } from "./types";

export const noteTagsRepository = {
  /**
   * ノートIDとタグIDで関連を取得
   */
  async findByNoteIdAndTagId(
    noteId: string,
    tagId: string,
    tx: TransactionClient = prisma
  ): Promise<NoteTag | null> {
    return tx.noteTag.findUnique({
      where: {
        noteId_tagId: { noteId, tagId },
      },
    });
  },

  /**
   * ノートIDで関連を取得
   */
  async findByNoteId(
    noteId: string,
    tx: TransactionClient = prisma
  ): Promise<NoteTag[]> {
    return tx.noteTag.findMany({
      where: { noteId },
      include: { tag: true },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * タグIDで関連を取得
   */
  async findByTagId(
    tagId: string,
    tx: TransactionClient = prisma
  ): Promise<NoteTag[]> {
    return tx.noteTag.findMany({
      where: { tagId },
      include: { note: true },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * ノートにタグを追加
   */
  async create(
    data: { noteId: string; tagId: string },
    tx: TransactionClient = prisma
  ): Promise<NoteTag> {
    return tx.noteTag.create({
      data,
    });
  },

  /**
   * ノートに複数タグを一括追加
   */
  async createMany(
    noteId: string,
    tagIds: string[],
    tx: TransactionClient = prisma
  ): Promise<Prisma.BatchPayload> {
    return tx.noteTag.createMany({
      data: tagIds.map((tagId) => ({ noteId, tagId })),
      skipDuplicates: true,
    });
  },

  /**
   * ノートから タグを削除
   */
  async delete(
    data: { noteId: string; tagId: string },
    tx: TransactionClient = prisma
  ): Promise<NoteTag> {
    return tx.noteTag.delete({
      where: {
        noteId_tagId: data,
      },
    });
  },

  /**
   * ノートから全タグを削除
   */
  async deleteByNoteId(
    noteId: string,
    tx: TransactionClient = prisma
  ): Promise<Prisma.BatchPayload> {
    return tx.noteTag.deleteMany({
      where: { noteId },
    });
  },

  /**
   * タグに紐づく全関連を削除（タグ削除時に使用）
   */
  async deleteByTagId(
    tagId: string,
    tx: TransactionClient = prisma
  ): Promise<Prisma.BatchPayload> {
    return tx.noteTag.deleteMany({
      where: { tagId },
    });
  },

  /**
   * 関連の件数を取得
   */
  async countByNoteId(
    noteId: string,
    tx: TransactionClient = prisma
  ): Promise<number> {
    return tx.noteTag.count({
      where: { noteId },
    });
  },

  /**
   * タグが使用されているノート数を取得
   */
  async countByTagId(
    tagId: string,
    tx: TransactionClient = prisma
  ): Promise<number> {
    return tx.noteTag.count({
      where: { tagId },
    });
  },
};
