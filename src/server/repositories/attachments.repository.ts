/**
 * Attachment Repository
 * 添付ファイルの純粋なCRUD操作のみを提供
 * 並び替えロジック等はService層で実装
 */

import { Prisma, Attachment } from "@prisma/client";
import prisma from "@/lib/prisma";
import { TransactionClient, FindOptions, SortOrder } from "./types";

/**
 * 添付ファイル取得時のIncludeオプション
 */
export interface AttachmentIncludeOptions {
  note?: boolean;
  owner?: boolean;
}

/**
 * 添付ファイル検索のソートオプション
 */
export interface AttachmentSortOptions {
  sortBy?: "createdAt" | "updatedAt" | "position" | "name";
  sortOrder?: SortOrder;
}

/**
 * Includeオプションを構築
 */
function buildInclude(
  options?: AttachmentIncludeOptions
): Prisma.AttachmentInclude | undefined {
  if (!options) return undefined;

  return {
    note: options.note,
    owner: options.owner,
  };
}

export const attachmentsRepository = {
  /**
   * IDで添付ファイルを取得
   */
  async findById(
    id: string,
    include?: AttachmentIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Attachment | null> {
    return tx.attachment.findUnique({
      where: { id },
      include: buildInclude(include),
    });
  },

  /**
   * 複数添付ファイルを取得
   */
  async findMany(
    where: Prisma.AttachmentWhereInput = {},
    options: FindOptions & AttachmentSortOptions = {},
    include?: AttachmentIncludeOptions,
    tx: TransactionClient = prisma
  ): Promise<Attachment[]> {
    const { take, skip, sortBy = "position", sortOrder = "asc" } = options;

    return tx.attachment.findMany({
      where,
      take,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: buildInclude(include),
    });
  },

  /**
   * ノート内の最大position番号を取得
   */
  async getMaxPosition(
    noteId: string,
    tx: TransactionClient = prisma
  ): Promise<number | null> {
    const result = await tx.attachment.aggregate({
      where: { noteId },
      _max: { position: true },
    });
    return result._max.position;
  },

  /**
   * 添付ファイルを作成
   */
  async create(
    data: Prisma.AttachmentCreateInput,
    tx: TransactionClient = prisma
  ): Promise<Attachment> {
    return tx.attachment.create({
      data,
    });
  },

  /**
   * 添付ファイルを更新
   */
  async updateById(
    id: string,
    data: Prisma.AttachmentUpdateInput,
    tx: TransactionClient = prisma
  ): Promise<Attachment> {
    return tx.attachment.update({
      where: { id },
      data,
    });
  },

  /**
   * 添付ファイルを削除
   */
  async deleteById(
    id: string,
    tx: TransactionClient = prisma
  ): Promise<Attachment> {
    return tx.attachment.delete({
      where: { id },
    });
  },

  /**
   * ノートの全添付ファイルを削除
   */
  async deleteByNoteId(
    noteId: string,
    tx: TransactionClient = prisma
  ): Promise<Prisma.BatchPayload> {
    return tx.attachment.deleteMany({
      where: { noteId },
    });
  },

  /**
   * 添付ファイルの件数を取得
   */
  async count(
    where: Prisma.AttachmentWhereInput = {},
    tx: TransactionClient = prisma
  ): Promise<number> {
    return tx.attachment.count({ where });
  },
};
