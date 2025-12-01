/**
 * Attachment Service
 * 添付ファイルのCRUD・並び順操作・ストレージ連携・レイアウト管理
 *
 * 要件対応:
 * - Tier1: ノートへの添付ファイル
 * - data-model.md: Note.id -> Attachment.noteId (1:N)
 * - positionで表示順を管理、mimeTypeでファイル種別管理
 * - Supabase Storageとの連携（アップロード/削除）
 * - ノート内での自由配置（位置・サイズ）
 */

import { Attachment, AttachmentKind, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  attachmentsRepository,
  AttachmentSortOptions,
} from "@/server/repositories";
import {
  ServiceError,
  PaginationInput,
  PaginatedResult,
  normalizePagination,
  buildPaginatedResult,
} from "../types";
import {
  uploadFile,
  deleteFile,
  deleteFiles,
  getPublicUrl,
  getSignedUrl,
  UploadFileResult,
} from "@/server/storage";

// ============================================================
// レイアウト関連の型定義
// ============================================================

/**
 * 添付ファイルの配置位置
 */
export type AttachmentAlign = "left" | "center" | "right";

/**
 * 添付ファイルのレイアウト情報
 * Attachment.metadata に格納される
 */
export interface AttachmentLayout {
  /** 本文内の挿入位置（行番号、0-indexed） */
  insertAfterLine?: number;
  /** 表示幅（"50%", "300px", "full"） */
  width?: string;
  /** 表示高さ（"auto", "200px"） */
  height?: string;
  /** 配置（左寄せ/中央/右寄せ） */
  align?: AttachmentAlign;
  /** キャプション */
  caption?: string;
  /** 代替テキスト（アクセシビリティ） */
  alt?: string;
}

/**
 * Attachment.metadata の型
 */
export interface AttachmentMetadata {
  layout?: AttachmentLayout;
  /** EXIF等の追加情報 */
  exif?: Record<string, unknown>;
  /** その他の拡張情報 */
  [key: string]: unknown;
}

/**
 * metadataからレイアウト情報を取得
 */
export function getAttachmentLayout(
  attachment: Attachment
): AttachmentLayout | null {
  if (!attachment.metadata) return null;
  const metadata = attachment.metadata as AttachmentMetadata;
  return metadata.layout ?? null;
}

/**
 * 型安全にmetadataを構築
 */
export function buildAttachmentMetadata(
  layout?: AttachmentLayout,
  extra?: Record<string, unknown>
): AttachmentMetadata {
  return {
    ...(layout && { layout }),
    ...extra,
  };
}

/**
 * 添付ファイル一覧取得の入力
 */
export interface ListAttachmentsInput {
  noteId: string;
  pagination?: PaginationInput;
  sort?: AttachmentSortOptions;
}

/**
 * 添付ファイル作成の入力
 */
export interface CreateAttachmentInput {
  ownerId: string;
  noteId: string;
  url: string;
  kind: AttachmentKind;
  name?: string;
  mimeType?: string;
  size?: number;
  storagePath?: string;
  position?: number;
  /** 初期レイアウト情報 */
  layout?: AttachmentLayout;
}

/**
 * 添付ファイル更新の入力
 */
export interface UpdateAttachmentInput {
  name?: string | null;
  position?: number;
  /** レイアウト情報の更新 */
  layout?: AttachmentLayout;
}

/**
 * ノートに紐づく添付ファイル一覧を取得
 */
export async function listAttachmentsForNote(
  input: ListAttachmentsInput
): Promise<PaginatedResult<Attachment>> {
  const { page, limit, skip } = normalizePagination(input.pagination);

  const where = { noteId: input.noteId };

  const [attachments, total] = await Promise.all([
    attachmentsRepository.findMany(where, { take: limit, skip, ...input.sort }),
    attachmentsRepository.count(where),
  ]);

  return buildPaginatedResult(attachments, total, page, limit);
}

/**
 * 添付ファイル詳細を取得
 */
export async function getAttachmentById(id: string): Promise<Attachment> {
  const attachment = await attachmentsRepository.findById(id);

  if (!attachment) {
    throw new ServiceError("添付ファイルが見つかりません", "NOT_FOUND", { id });
  }

  return attachment;
}

/**
 * 添付ファイルを作成
 */
export async function createAttachment(
  input: CreateAttachmentInput
): Promise<Attachment> {
  // positionが未指定の場合、最後尾に追加
  let position = input.position;

  if (position === undefined) {
    const maxPosition = await attachmentsRepository.getMaxPosition(
      input.noteId
    );
    position = (maxPosition ?? 0) + 1;
  }

  // レイアウト情報がある場合、metadataに格納
  const metadata = input.layout
    ? (buildAttachmentMetadata(input.layout) as Prisma.InputJsonValue)
    : undefined;

  return attachmentsRepository.create({
    url: input.url,
    kind: input.kind,
    name: input.name,
    mimeType: input.mimeType,
    size: input.size,
    storagePath: input.storagePath,
    position,
    metadata,
    owner: { connect: { id: input.ownerId } },
    note: { connect: { id: input.noteId } },
  });
}

/**
 * 添付ファイルを更新
 */
export async function updateAttachment(
  id: string,
  input: UpdateAttachmentInput
): Promise<Attachment> {
  const existing = await getAttachmentById(id);

  // レイアウト情報の更新がある場合、metadataをマージ
  let metadata: Prisma.InputJsonValue | undefined = undefined;
  if (input.layout !== undefined) {
    const existingMetadata = existing.metadata as AttachmentMetadata | null;
    const newMetadata: AttachmentMetadata = {
      ...(existingMetadata ?? {}),
      layout: input.layout,
    };
    metadata = newMetadata as unknown as Prisma.InputJsonValue;
  }

  return attachmentsRepository.updateById(id, {
    name: input.name,
    position: input.position,
    ...(metadata !== undefined && { metadata }),
  });
}

/**
 * 添付ファイルのレイアウトのみを更新
 */
export async function updateAttachmentLayout(
  id: string,
  layout: AttachmentLayout
): Promise<Attachment> {
  return updateAttachment(id, { layout });
}

/**
 * 添付ファイルを削除
 */
export async function deleteAttachment(id: string): Promise<void> {
  await getAttachmentById(id);
  await attachmentsRepository.deleteById(id);
}

/**
 * ノートの全添付ファイルを削除
 */
export async function deleteAllAttachmentsForNote(
  noteId: string
): Promise<void> {
  await attachmentsRepository.deleteByNoteId(noteId);
}

/**
 * 添付ファイルの並び順を更新
 */
export async function reorderAttachments(
  noteId: string,
  attachmentOrders: Array<{ id: string; position: number }>
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const { id, position } of attachmentOrders) {
      await attachmentsRepository.updateById(id, { position }, tx);
    }
  });
}

/**
 * ノートの添付ファイル数を取得
 */
export async function getAttachmentCountForNote(
  noteId: string
): Promise<number> {
  return attachmentsRepository.count({ noteId });
}

/**
 * ノートの添付ファイル合計サイズを取得
 */
export async function getTotalAttachmentSizeForNote(
  noteId: string
): Promise<number> {
  const attachments = await attachmentsRepository.findMany({ noteId });
  return attachments.reduce(
    (sum: number, att: Attachment) => sum + (att.size ?? 0),
    0
  );
}

/**
 * MIMEタイプで添付ファイルをフィルタリング
 */
export async function listAttachmentsByMimeType(
  noteId: string,
  mimeTypePrefix: string,
  pagination?: PaginationInput
): Promise<PaginatedResult<Attachment>> {
  const { page, limit, skip } = normalizePagination(pagination);

  const where = {
    noteId,
    mimeType: { startsWith: mimeTypePrefix },
  };

  const [attachments, total] = await Promise.all([
    attachmentsRepository.findMany(where, {
      take: limit,
      skip,
      sortBy: "position",
      sortOrder: "asc",
    }),
    attachmentsRepository.count(where),
  ]);

  return buildPaginatedResult(attachments, total, page, limit);
}

/**
 * 画像添付ファイルのみ取得
 */
export async function listImageAttachments(
  noteId: string,
  pagination?: PaginationInput
): Promise<PaginatedResult<Attachment>> {
  return listAttachmentsByMimeType(noteId, "image/", pagination);
}

// ============================================================
// Storage連携機能
// ============================================================

/**
 * ファイルアップロード＋添付レコード作成の入力
 */
export interface UploadAndCreateAttachmentInput {
  /** アップロードするファイル */
  file: Buffer | Blob;
  /** ファイル名 */
  fileName: string;
  /** オーナーID */
  ownerId: string;
  /** ノートID */
  noteId: string;
  /** MIMEタイプ */
  mimeType?: string;
  /** 添付種別（省略時はmimeTypeから自動推定） */
  kind?: AttachmentKind;
  /** 表示位置（省略時は末尾に追加） */
  position?: number;
  /** 初期レイアウト情報 */
  layout?: AttachmentLayout;
}

/**
 * ファイルをアップロードして添付レコードを作成
 * Storage + DB をトランザクション的に処理
 */
export async function uploadAndCreateAttachment(
  input: UploadAndCreateAttachmentInput
): Promise<Attachment> {
  let uploadResult: UploadFileResult | null = null;

  try {
    // 1. ファイルをStorageにアップロード
    uploadResult = await uploadFile({
      file: input.file,
      fileName: input.fileName,
      ownerId: input.ownerId,
      noteId: input.noteId,
      mimeType: input.mimeType,
    });

    // 2. positionを決定
    let position = input.position;
    if (position === undefined) {
      const maxPosition = await attachmentsRepository.getMaxPosition(
        input.noteId
      );
      position = (maxPosition ?? 0) + 1;
    }

    // 3. レイアウト情報がある場合、metadataに格納
    const metadata = input.layout
      ? (buildAttachmentMetadata(input.layout) as Prisma.InputJsonValue)
      : undefined;

    // 4. kindが未指定の場合、mimeTypeから自動推定
    const kind = input.kind ?? inferAttachmentKind(input.mimeType);

    // 5. DBにAttachmentレコードを作成
    const attachment = await attachmentsRepository.create({
      url: uploadResult.publicUrl,
      storagePath: uploadResult.storagePath,
      kind,
      name: input.fileName,
      mimeType: input.mimeType,
      size: uploadResult.size,
      position,
      metadata,
      owner: { connect: { id: input.ownerId } },
      note: { connect: { id: input.noteId } },
    });

    return attachment;
  } catch (error) {
    // アップロード成功後にDB作成失敗した場合、Storageからも削除
    if (uploadResult?.storagePath) {
      try {
        await deleteFile({ storagePath: uploadResult.storagePath });
      } catch {
        // 削除失敗はログのみ（オーファンファイルは後でクリーンアップ）
        console.error(
          "Failed to cleanup orphan file:",
          uploadResult.storagePath
        );
      }
    }
    throw error;
  }
}

/**
 * 添付ファイルを削除（Storage + DB）
 */
export async function deleteAttachmentWithStorage(id: string): Promise<void> {
  const attachment = await getAttachmentById(id);

  // 1. Storageから削除（storagePathがある場合）
  if (attachment.storagePath) {
    try {
      await deleteFile({ storagePath: attachment.storagePath });
    } catch (error) {
      // Storage削除失敗してもDB削除は続行（ログ記録）
      console.error(
        "Failed to delete from storage:",
        attachment.storagePath,
        error
      );
    }
  }

  // 2. DBから削除
  await attachmentsRepository.deleteById(id);
}

/**
 * ノートの全添付ファイルを削除（Storage + DB）
 */
export async function deleteAllAttachmentsWithStorageForNote(
  noteId: string
): Promise<void> {
  // 1. 対象の添付ファイルを取得
  const attachments = await attachmentsRepository.findMany({ noteId });

  // 2. Storageパスを収集
  const storagePaths = attachments
    .map((a) => a.storagePath)
    .filter((path): path is string => path !== null);

  // 3. Storageから一括削除
  if (storagePaths.length > 0) {
    try {
      await deleteFiles(storagePaths);
    } catch (error) {
      console.error(
        "Failed to delete files from storage:",
        storagePaths,
        error
      );
    }
  }

  // 4. DBから一括削除
  await attachmentsRepository.deleteByNoteId(noteId);
}

/**
 * 添付ファイルの公開URLを取得
 */
export function getAttachmentPublicUrl(attachment: Attachment): string {
  // storagePathがあればStorageから、なければ直接URLを返す
  if (attachment.storagePath) {
    return getPublicUrl(attachment.storagePath);
  }
  return attachment.url;
}

/**
 * 添付ファイルの署名付きURL（有効期限付き）を取得
 * プライベートバケット用
 */
export async function getAttachmentSignedUrl(
  attachment: Attachment,
  expiresIn: number = 3600
): Promise<string> {
  if (!attachment.storagePath) {
    throw new ServiceError(
      "外部URLの添付ファイルには署名付きURLを生成できません",
      "INVALID_OPERATION",
      { attachmentId: attachment.id }
    );
  }
  return getSignedUrl(attachment.storagePath, expiresIn);
}

/**
 * MIMEタイプからAttachmentKindを推定
 */
export function inferAttachmentKind(mimeType?: string): AttachmentKind {
  if (!mimeType) return "FILE";

  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("text/html") || mimeType === "application/pdf") {
    return "LINK"; // リンクプレビュー対応の可能性があるもの
  }
  return "FILE";
}
