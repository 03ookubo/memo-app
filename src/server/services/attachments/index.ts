/**
 * Attachment Service - エクスポート
 */

export {
  // 基本CRUD
  listAttachmentsForNote,
  getAttachmentById,
  createAttachment,
  updateAttachment,
  deleteAttachment,
  deleteAllAttachmentsForNote,
  // 並び順
  reorderAttachments,
  // ユーティリティ
  getAttachmentCountForNote,
  getTotalAttachmentSizeForNote,
  listAttachmentsByMimeType,
  listImageAttachments,
  // Storage連携
  uploadAndCreateAttachment,
  deleteAttachmentWithStorage,
  deleteAllAttachmentsWithStorageForNote,
  getAttachmentPublicUrl,
  getAttachmentSignedUrl,
  inferAttachmentKind,
  // レイアウト管理
  getAttachmentLayout,
  buildAttachmentMetadata,
  updateAttachmentLayout,
  // 型
  type ListAttachmentsInput,
  type CreateAttachmentInput,
  type UpdateAttachmentInput,
  type UploadAndCreateAttachmentInput,
  type AttachmentLayout,
  type AttachmentAlign,
  type AttachmentMetadata,
} from "./attachment.service";
