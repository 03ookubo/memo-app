/**
 * Service層の共通型定義とカスタムエラー
 */

/**
 * サービス層のカスタムエラー
 * API層でHTTPステータスコードに変換される
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: ServiceErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/**
 * エラーコード
 */
export type ServiceErrorCode =
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "CONFIGURATION_ERROR"
  | "STORAGE_ERROR"
  | "INVALID_OPERATION";

/**
 * HTTPステータスコードへのマッピング
 */
export const errorCodeToStatus: Record<ServiceErrorCode, number> = {
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  VALIDATION_ERROR: 400,
  PERMISSION_DENIED: 403,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  CONFIGURATION_ERROR: 500,
  STORAGE_ERROR: 500,
  INVALID_OPERATION: 400,
};

/**
 * ページネーション入力
 */
export interface PaginationInput {
  page?: number;
  limit?: number;
}

/**
 * ページネーション出力
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * ページネーションのデフォルト値
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * ページネーションオプションを正規化
 */
export function normalizePagination(input?: PaginationInput): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, input?.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, input?.limit ?? DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * ページネーション結果を構築
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
