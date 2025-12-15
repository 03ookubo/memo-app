import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // テスト環境
    environment: "node",

    // グローバル設定（describe, it, expect を import 不要に）
    globals: true,

    // テストファイルのパターン
    include: ["tests/**/*.test.ts"],

    // カバレッジ設定
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/server/**/*.ts", "src/lib/validation/**/*.ts"],
      exclude: [
        "src/server/**/index.ts",
        "src/server/**/types.ts",
        "**/*.d.ts",
      ],
      // カバレッジ目標
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },

    // タイムアウト
    testTimeout: 15000,
    hookTimeout: 15000,

    // セットアップファイル
    setupFiles: ["./tests/setup.ts"],

    // テストの並列実行を制御（DB競合を避けるため）
    // ファイル間の並列実行を無効化
    fileParallelism: false,
    pool: "forks",
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
