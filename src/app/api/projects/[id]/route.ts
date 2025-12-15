/**
 * Projects API - 個別エンドポイント
 * GET /api/projects/[id] - プロジェクト詳細取得
 * PATCH /api/projects/[id] - プロジェクト更新
 * DELETE /api/projects/[id] - プロジェクト削除
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as ProjectService from "@/server/services/projects/project.service";
import {
  updateProjectSchema,
  deleteProjectSchema,
} from "@/lib/validation/project-schemas";
import {
  successResponse,
  noContentResponse,
  handleError,
} from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]
 * プロジェクト詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;

    const project = await ProjectService.getProjectById(id, userId, {
      notes: true,
    });

    return successResponse(project);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/projects/[id]
 * プロジェクトを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;
    const body = await request.json();
    const data = updateProjectSchema.parse(body);

    const project = await ProjectService.updateProject(id, userId, {
      name: data.name,
      description: data.description,
      emoji: data.emoji,
      sortIndex: data.sortIndex,
    });

    return successResponse(project);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/projects/[id]
 * プロジェクトを削除
 * - permanent=false（デフォルト）: ソフトデリート
 * - permanent=true: 完全削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { permanent } = deleteProjectSchema.parse(searchParams);

    if (permanent) {
      await ProjectService.hardDeleteProject(id, userId);
    } else {
      await ProjectService.softDeleteProject(id, userId);
    }

    return noContentResponse();
  } catch (error) {
    return handleError(error);
  }
}
