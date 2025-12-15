/**
 * Tasks Repository - Integration Tests
 * 実際のデータベースを使用してタスクリポジトリの動作を検証
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { tasksRepository, usersRepository, notesRepository } from "@/server/repositories";
import { createUserData, createNoteData, createTaskData } from "../../helpers/factories";
import { getTestPrisma } from "../../helpers/db";

describe("Tasks Repository - Integration Tests", () => {
  const testPrisma = getTestPrisma();
  let testUserId: string;
  let testNoteId: string;

  beforeEach(async () => {
    // 各テストの前に全データをクリーンアップ (FK制約に従って子から親へ)
    await testPrisma.task.deleteMany();
    await testPrisma.event.deleteMany();
    await testPrisma.attachment.deleteMany();
    await testPrisma.noteTag.deleteMany();
    await testPrisma.note.deleteMany();
    await testPrisma.tag.deleteMany();
    await testPrisma.project.deleteMany();
    await testPrisma.integration.deleteMany();
    await testPrisma.linkCode.deleteMany();
    await testPrisma.credential.deleteMany();
    await testPrisma.user.deleteMany();
    
    // テスト用ユーザーとノートを作成
    const user = await usersRepository.create(createUserData(), testPrisma);
    testUserId = user.id;
    
    const note = await notesRepository.create(
      createNoteData(testUserId),
      testPrisma
    );
    testNoteId = note.id;
  });

  describe("create", () => {
    it("正常系: 基本的なタスクを作成できる", async () => {
      const taskData = createTaskData(testNoteId);
      const created = await tasksRepository.create(taskData, testPrisma);

      expect(created).toBeDefined();
      expect(created.noteId).toBe(testNoteId);
      expect(created.priority).toBe(taskData.priority);
      expect(created.dueAt).toEqual(taskData.dueAt);
    });

    it("正常系: 完了済みタスクを作成できる", async () => {
      const taskData = createTaskData(testNoteId, {
        completedAt: new Date(),
      });
      const created = await tasksRepository.create(taskData, testPrisma);

      expect(created.completedAt).toBeDefined();
    });

    it("正常系: recurrenceRuleを持つタスクを作成できる", async () => {
      const taskData = createTaskData(testNoteId, {
        recurrenceRule: "FREQ=DAILY;INTERVAL=1",
      });
      const created = await tasksRepository.create(taskData, testPrisma);

      expect(created.recurrenceRule).toBe("FREQ=DAILY;INTERVAL=1");
    });

    it("正常系: metadataを含むタスクを作成できる", async () => {
      const metadata = { habitType: "daily", streak: 5 };
      const taskData = createTaskData(testNoteId, { metadata });
      const created = await tasksRepository.create(taskData, testPrisma);

      expect(created.metadata).toEqual(metadata);
    });
  });

  describe("findByNoteId", () => {
    it("正常系: noteIdでタスクを取得できる", async () => {
      const created = await tasksRepository.create(
        createTaskData(testNoteId),
        testPrisma
      );

      const found = await tasksRepository.findByNoteId(
        testNoteId,
        undefined,
        testPrisma
      );

      expect(found).toBeDefined();
      expect(found?.noteId).toBe(testNoteId);
      expect(found?.priority).toBe(created.priority);
    });

    it("異常系: 存在しないnoteIdはnullを返す", async () => {
      const found = await tasksRepository.findByNoteId(
        "non-existent-note-id",
        undefined,
        testPrisma
      );

      expect(found).toBeNull();
    });
  });

  describe("findMany", () => {
    beforeEach(async () => {
      // 複数タスクを作成
      for (let i = 0; i < 3; i++) {
        const note = await notesRepository.create(
          createNoteData(testUserId),
          testPrisma
        );
        await tasksRepository.create(createTaskData(note.id), testPrisma);
      }
    });

    it("正常系: 全タスクを取得できる", async () => {
      const tasks = await tasksRepository.findMany(
        {},
        {},
        undefined,
        testPrisma
      );

      expect(tasks.length).toBeGreaterThanOrEqual(3);
    });

    it("正常系: 完了していないタスクのみ取得できる", async () => {
      const tasks = await tasksRepository.findMany(
        { completedAt: null },
        {},
        undefined,
        testPrisma
      );

      expect(tasks.every((t) => t.completedAt === null)).toBe(true);
    });

    it("境界値: priorityでソートできる", async () => {
      const tasks = await tasksRepository.findMany(
        {},
        { sortBy: "priority", sortOrder: "desc" },
        undefined,
        testPrisma
      );

      expect(tasks.length).toBeGreaterThan(0);
      for (let i = 1; i < tasks.length; i++) {
        if (tasks[i].priority !== null && tasks[i - 1].priority !== null) {
          expect(tasks[i].priority!).toBeLessThanOrEqual(tasks[i - 1].priority!);
        }
      }
    });
  });

  describe("updateByNoteId", () => {
    it("正常系: タスク情報を更新できる", async () => {
      await tasksRepository.create(createTaskData(testNoteId), testPrisma);

      const updated = await tasksRepository.updateByNoteId(
        testNoteId,
        { priority: 5, completedAt: new Date() },
        testPrisma
      );

      expect(updated.priority).toBe(5);
      expect(updated.completedAt).toBeDefined();
    });

    it("異常系: 存在しないnoteIdの更新はエラー", async () => {
      await expect(
        tasksRepository.updateByNoteId(
          "non-existent-note-id",
          { priority: 1 },
          testPrisma
        )
      ).rejects.toThrow();
    });
  });

  describe("deleteByNoteId", () => {
    it("正常系: タスクを削除できる", async () => {
      await tasksRepository.create(createTaskData(testNoteId), testPrisma);

      await tasksRepository.deleteByNoteId(testNoteId, testPrisma);

      const found = await tasksRepository.findByNoteId(
        testNoteId,
        undefined,
        testPrisma
      );
      expect(found).toBeNull();
    });

    it("異常系: 存在しないnoteIdの削除はエラー", async () => {
      await expect(
        tasksRepository.deleteByNoteId("non-existent-note-id", testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      for (let i = 0; i < 2; i++) {
        const note = await notesRepository.create(
          createNoteData(testUserId),
          testPrisma
        );
        await tasksRepository.create(createTaskData(note.id), testPrisma);
      }
    });

    it("正常系: 条件なしでカウントできる", async () => {
      const count = await tasksRepository.count({}, testPrisma);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("正常系: 完了状態でカウントできる", async () => {
      const count = await tasksRepository.count(
        { completedAt: null },
        testPrisma
      );
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });
});
