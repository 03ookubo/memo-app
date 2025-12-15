/**
 * Attachments API - 個別エンドポイント
 * GET /api/attachments/[id] - 添付ファイル詳細取得
 * PATCH /api/attachments/[id] - 添付ファイル更新
 * DELETE /api/attachments/[id] - 添付ファイル削除
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as AttachmentService from "@/server/services/attachments/attachment.service";
import { updateAttachmentSchema } from "@/lib/validation/attachment-schemas";
import {
  successResponse,
  noContentResponse,
  handleError,
} from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/attachments/[id]
 * 添付ファイル詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthUserId();
    const { id } = await params;

    const attachment = await AttachmentService.getAttachmentById(id);

    return successResponse(attachment);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/attachments/[id]
 * 添付ファイルを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthUserId();
    const { id } = await params;
    const body = await request.json();
    const data = updateAttachmentSchema.parse(body);

    const attachment = await AttachmentService.updateAttachment(id, {
      name: data.name,
      position: data.position,
      layout: data.layout,
    });

    return successResponse(attachment);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/attachments/[id]
 * 添付ファイルを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthUserId();
    const { id } = await params;

    await AttachmentService.deleteAttachment(id);

    return noContentResponse();
  } catch (error) {
    return handleError(error);
  }
}
