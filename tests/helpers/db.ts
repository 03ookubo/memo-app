/**
 * データベーステストヘルパー
 * 実DBを使用した統合テスト用のユーティリティ
 */
import { PrismaClient } from "@prisma/client";

// テスト用Prismaクライアント（本番と分離）
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

/**
 * データベース全体をクリーンアップ
 * テスト前後に実行してクリーンな状態にする
 */
export async function cleanupDatabase() {
  try {
    // 外部キー制約を考慮した削除順序
    await testPrisma.noteTag.deleteMany();
    await testPrisma.attachment.deleteMany();
    await testPrisma.event.deleteMany();
    await testPrisma.task.deleteMany();
    await testPrisma.note.deleteMany();
    await testPrisma.tag.deleteMany();
    await testPrisma.project.deleteMany();
    await testPrisma.integration.deleteMany();
    await testPrisma.linkCode.deleteMany();
    await testPrisma.credential.deleteMany();
    await testPrisma.user.deleteMany();
  } catch (error) {
    console.error("Database cleanup failed:", error);
    throw error;
  }
}

/**
 * 特定のテーブルをクリーンアップ
 * 外部キー制約を考慮して依存テーブルも削除
 */
export async function cleanupTable(tableName: keyof PrismaClient) {
  try {
    // ユーザー削除時は全ての依存データも削除
    if (tableName === "user") {
      await testPrisma.noteTag.deleteMany();
      await testPrisma.attachment.deleteMany();
      await testPrisma.event.deleteMany();
      await testPrisma.task.deleteMany();
      await testPrisma.note.deleteMany();
      await testPrisma.tag.deleteMany();
      await testPrisma.project.deleteMany();
      await testPrisma.integration.deleteMany();
      await testPrisma.linkCode.deleteMany();
      await testPrisma.credential.deleteMany();
    }
    
    // プロジェクト削除時はノートとの関係をクリア
    if (tableName === "project") {
      await testPrisma.note.updateMany({
        where: { projectId: { not: null } },
        data: { projectId: null },
      });
    }
    
    // ノート削除時は依存データを削除
    if (tableName === "note") {
      await testPrisma.noteTag.deleteMany();
      await testPrisma.attachment.deleteMany();
      await testPrisma.event.deleteMany();
      await testPrisma.task.deleteMany();
    }
    
    // タグ削除時はノートタグを削除
    if (tableName === "tag") {
      await testPrisma.noteTag.deleteMany();
    }

    const table = testPrisma[tableName] as any;
    if (table && typeof table.deleteMany === "function") {
      await table.deleteMany();
    }
  } catch (error) {
    console.error(`Failed to cleanup table ${String(tableName)}:`, error);
    throw error;
  }
}

/**
 * テスト用トランザクション実行
 */
export async function runInTransaction<T>(
  fn: (tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]) => Promise<T>
): Promise<T> {
  return testPrisma.$transaction(fn);
}

/**
 * テスト用Prismaクライアントを取得
 */
export function getTestPrisma(): PrismaClient {
  return testPrisma;
}

/**
 * 接続を閉じる
 */
export async function disconnectTestDb() {
  await testPrisma.$disconnect();
}

export default testPrisma;
