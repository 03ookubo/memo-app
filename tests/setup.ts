/**
 * Vitest グローバルセットアップ
 * 全テスト実行前に一度だけ実行される
 */
import { beforeAll, afterAll } from "vitest";
import { cleanupDatabase } from "./helpers/db";

// テスト実行前: データベース初期化
beforeAll(async () => {
  console.log("🔧 Test environment setup...");
  await cleanupDatabase();
  console.log("✅ Test environment ready");
});

// テスト実行後: クリーンアップ
afterAll(async () => {
  console.log("🧹 Cleaning up test environment...");
  await cleanupDatabase();
  console.log("✅ Test environment cleaned");
});
