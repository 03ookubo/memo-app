/**
 * Projects API - 一覧・作成エンドポイント
 * GET /api/projects - プロジェクト一覧取得
 * POST /api/projects - プロジェクト作成
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as ProjectService from "@/server/services/projects/project.service";
import {
  createProjectSchema,
  listProjectsQuerySchema,
} from "@/lib/validation/project-schemas";
import {
  successResponse,
  createdResponse,
  handleError,
} from "@/lib/api/response";

/**
 * GET /api/projects
 * プロジェクト一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listProjectsQuerySchema.parse(searchParams);

    const listInput = {
      ownerId: userId,
      pagination: { page: query.page, limit: query.limit },
    };

    const result =
      query.status === "archived"
        ? await ProjectService.listArchivedProjects(listInput)
        : await ProjectService.listActiveProjects(listInput);

    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/projects
 * 新規プロジェクトを作成
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();
    const body = await request.json();
    const data = createProjectSchema.parse(body);

    const project = await ProjectService.createProject({
      ownerId: userId,
      name: data.name,
      description: data.description,
      emoji: data.emoji,
      sortIndex: data.sortIndex,
    });

    return createdResponse(project);
  } catch (error) {
    return handleError(error);
  }
}
