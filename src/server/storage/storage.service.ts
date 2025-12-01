/**
 * Storage Service
 * Supabase Storage との連携を担当
 *
 * 責務:
 * - ファイルのアップロード
 * - ファイルのダウンロードURL取得
 * - ファイルの削除
 * - ファイルの存在確認
 *
 * 設計方針:
 * - Supabase Storage クライアントをラップ
 * - ファイルパスの命名規則を統一
 * - エラーハンドリングの標準化
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "../services/types";

/**
 * Supabase クライアントのシングルトン
 */
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new ServiceError(
      "Supabase環境変数が設定されていません",
      "CONFIGURATION_ERROR",
      { required: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] }
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseClient;
}

/**
 * デフォルトのバケット名
 */
const DEFAULT_BUCKET = "attachments";

/**
 * ファイルアップロードの入力
 */
export interface UploadFileInput {
  /** アップロードするファイル（Buffer または Blob） */
  file: Buffer | Blob;
  /** ファイル名（拡張子含む） */
  fileName: string;
  /** オーナーID（ファイルパス生成に使用） */
  ownerId: string;
  /** ノートID（ファイルパス生成に使用） */
  noteId: string;
  /** MIMEタイプ */
  mimeType?: string;
  /** バケット名（デフォルト: attachments） */
  bucket?: string;
}

/**
 * ファイルアップロードの結果
 */
export interface UploadFileResult {
  /** Storage内のパス */
  storagePath: string;
  /** 公開URL */
  publicUrl: string;
  /** ファイル名 */
  fileName: string;
  /** ファイルサイズ（バイト） */
  size: number;
}

/**
 * ファイル削除の入力
 */
export interface DeleteFileInput {
  /** Storage内のパス */
  storagePath: string;
  /** バケット名（デフォルト: attachments） */
  bucket?: string;
}

/**
 * ストレージパスを生成
 * 形式: {ownerId}/{noteId}/{timestamp}_{fileName}
 */
function generateStoragePath(
  ownerId: string,
  noteId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${ownerId}/${noteId}/${timestamp}_${sanitizedFileName}`;
}

/**
 * ファイルをアップロード
 */
export async function uploadFile(
  input: UploadFileInput
): Promise<UploadFileResult> {
  const supabase = getSupabaseClient();
  const bucket = input.bucket ?? DEFAULT_BUCKET;
  const storagePath = generateStoragePath(
    input.ownerId,
    input.noteId,
    input.fileName
  );

  // ファイルサイズを取得
  const size =
    input.file instanceof Buffer
      ? input.file.length
      : input.file instanceof Blob
      ? input.file.size
      : 0;

  // アップロード実行
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, input.file, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new ServiceError(
      `ファイルのアップロードに失敗しました: ${uploadError.message}`,
      "STORAGE_ERROR",
      { storagePath, bucket, originalError: uploadError }
    );
  }

  // 公開URLを取得
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl,
    fileName: input.fileName,
    size,
  };
}

/**
 * ファイルを削除
 */
export async function deleteFile(input: DeleteFileInput): Promise<void> {
  const supabase = getSupabaseClient();
  const bucket = input.bucket ?? DEFAULT_BUCKET;

  const { error } = await supabase.storage
    .from(bucket)
    .remove([input.storagePath]);

  if (error) {
    throw new ServiceError(
      `ファイルの削除に失敗しました: ${error.message}`,
      "STORAGE_ERROR",
      { storagePath: input.storagePath, bucket, originalError: error }
    );
  }
}

/**
 * 複数ファイルを一括削除
 */
export async function deleteFiles(
  storagePaths: string[],
  bucket: string = DEFAULT_BUCKET
): Promise<void> {
  if (storagePaths.length === 0) return;

  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from(bucket).remove(storagePaths);

  if (error) {
    throw new ServiceError(
      `ファイルの一括削除に失敗しました: ${error.message}`,
      "STORAGE_ERROR",
      { storagePaths, bucket, originalError: error }
    );
  }
}

/**
 * 公開URLを取得
 */
export function getPublicUrl(
  storagePath: string,
  bucket: string = DEFAULT_BUCKET
): string {
  const supabase = getSupabaseClient();
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return publicUrl;
}

/**
 * 署名付きURL（有効期限付き）を取得
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600,
  bucket: string = DEFAULT_BUCKET
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new ServiceError(
      `署名付きURLの生成に失敗しました: ${error?.message ?? "不明なエラー"}`,
      "STORAGE_ERROR",
      { storagePath, bucket, originalError: error }
    );
  }

  return data.signedUrl;
}

/**
 * ファイルの存在確認
 */
export async function fileExists(
  storagePath: string,
  bucket: string = DEFAULT_BUCKET
): Promise<boolean> {
  const supabase = getSupabaseClient();

  // ファイル情報を取得してエラーがなければ存在する
  const { error } = await supabase.storage.from(bucket).download(storagePath);

  // エラーがなければ存在、あれば存在しない（または他のエラー）
  return !error;
}

/**
 * ファイルのメタデータを取得
 */
export async function getFileMetadata(
  storagePath: string,
  bucket: string = DEFAULT_BUCKET
): Promise<{ size: number; mimeType: string | null } | null> {
  const supabase = getSupabaseClient();

  // リスト取得でメタデータを得る
  const pathParts = storagePath.split("/");
  const fileName = pathParts.pop() ?? "";
  const folderPath = pathParts.join("/");

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folderPath, { search: fileName });

  if (error || !data || data.length === 0) {
    return null;
  }

  const file = data.find((f) => f.name === fileName);
  if (!file) return null;

  return {
    size: file.metadata?.size ?? 0,
    mimeType: file.metadata?.mimetype ?? null,
  };
}
