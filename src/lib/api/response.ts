/**
 * API レスポンスヘルパー
 */

import { NextResponse } from "next/server";
import { ServiceError } from "@/server/services/types";
import { ZodError } from "zod";

/**
 * 成功レスポンス
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * 作成成功レスポンス
 */
export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

/**
 * 削除成功レスポンス（No Content）
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * エラーレスポンス
 */
export function errorResponse(
  message: string,
  status: number,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        code: code ?? "UNKNOWN_ERROR",
      },
    },
    { status }
  );
}

/**
 * ServiceError からHTTPステータスコードを取得
 */
function getStatusFromErrorCode(code: string): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "PERMISSION_DENIED":
      return 403;
    case "ALREADY_EXISTS":
      return 409;
    case "CONFLICT":
      return 409;
    case "VALIDATION_ERROR":
      return 400;
    default:
      return 500;
  }
}

/**
 * エラーハンドリング
 */
export function handleError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Zod バリデーションエラー
  if (error instanceof ZodError) {
    return errorResponse(
      error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
      400,
      "VALIDATION_ERROR"
    );
  }

  // ServiceError
  if (error instanceof ServiceError) {
    return errorResponse(
      error.message,
      getStatusFromErrorCode(error.code),
      error.code
    );
  }

  // その他のエラー
  if (error instanceof Error) {
    return errorResponse(error.message, 500, "INTERNAL_ERROR");
  }

  return errorResponse("予期せぬエラーが発生しました", 500, "INTERNAL_ERROR");
}
