/**
 * Projects Archive API
 * POST /api/projects/[id]/archive - プロジェクトのアーカイブ/解除
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as ProjectService from "@/server/services/projects/project.service";
import { archiveProjectSchema } from "@/lib/validation/project-schemas";
import { successResponse, handleError } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/projects/[id]/archive
 * プロジェクトをアーカイブ/解除
 * body: { action: "archive" | "unarchive" }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;
    const body = await request.json();
    const { action } = archiveProjectSchema.parse(body);

    const project =
      action === "archive"
        ? await ProjectService.archiveProject(id, userId)
        : await ProjectService.unarchiveProject(id, userId);

    return successResponse(project);
  } catch (error) {
    return handleError(error);
  }
}
