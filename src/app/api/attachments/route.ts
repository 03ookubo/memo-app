/**
 * Attachments API - 一覧・作成エンドポイント
 * GET /api/attachments - 添付ファイル一覧取得（noteId必須）
 * POST /api/attachments - 添付ファイル作成（URLからの埋め込み）
 */

import { NextRequest } from "next/server";
import { AttachmentKind } from "@prisma/client";
import { requireAuthUserId } from "@/server/auth/session";
import * as AttachmentService from "@/server/services/attachments/attachment.service";
import {
  createAttachmentSchema,
  listAttachmentsQuerySchema,
} from "@/lib/validation/attachment-schemas";
import {
  successResponse,
  createdResponse,
  handleError,
} from "@/lib/api/response";

/**
 * GET /api/attachments
 * 添付ファイル一覧を取得
 * クエリパラメータ: noteId（必須）
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUserId();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listAttachmentsQuerySchema.parse(searchParams);

    const result = await AttachmentService.listAttachmentsForNote({
      noteId: query.noteId,
      pagination: { page: query.page, limit: query.limit },
    });

    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/attachments
 * 添付ファイルを作成（URLからの埋め込み）
 * 注意: ファイルアップロードは /api/attachments/upload を使用
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();
    const body = await request.json();
    const data = createAttachmentSchema.parse(body);

    const attachment = await AttachmentService.createAttachment({
      ownerId: userId,
      noteId: data.noteId,
      url: data.url,
      kind: data.kind as AttachmentKind,
      name: data.name,
      mimeType: data.mimeType,
      position: data.position,
      layout: data.layout,
    });

    return createdResponse(attachment);
  } catch (error) {
    return handleError(error);
  }
}
