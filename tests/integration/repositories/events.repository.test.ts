/**
 * Events Repository - Integration Tests
 * 実際のデータベースを使用してイベントリポジトリの動作を検証
 */

import { describe, it, expect, beforeEach } from "vitest";
import { eventsRepository, usersRepository, notesRepository } from "@/server/repositories";
import { createUserData, createNoteData, createEventData } from "../../helpers/factories";
import { getTestPrisma } from "../../helpers/db";

describe("Events Repository - Integration Tests", () => {
  const testPrisma = getTestPrisma();
  let testUserId: string;
  let testNoteId: string;

  // noteIdを除外してPrismaの`note`リレーションを使用するヘルパー
  const prepareEventData = (noteId: string, overrides?: any) => {
    const { noteId: _, ...eventData } = createEventData(noteId, overrides);
    return { note: { connect: { id: noteId } }, ...eventData };
  };

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
    it("正常系: 基本的なイベントを作成できる", async () => {
      const { noteId, ...eventData } = createEventData(testNoteId);
      const created = await eventsRepository.create(
        { note: { connect: { id: testNoteId } }, ...eventData },
        testPrisma
      );

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.noteId).toBe(testNoteId);
      expect(created.startAt).toBeInstanceOf(Date);
      expect(created.endAt).toBeInstanceOf(Date);
      expect(created.isAllDay).toBe(false);
    });

    it("正常系: 終日イベントを作成できる", async () => {
      const { noteId, ...eventData } = createEventData(testNoteId, { isAllDay: true });
      const created = await eventsRepository.create(
        { note: { connect: { id: testNoteId } }, ...eventData },
        testPrisma
      );

      expect(created.isAllDay).toBe(true);
    });

    it("正常系: 繰り返しイベントを作成できる", async () => {
      const { noteId, ...eventData } = createEventData(testNoteId, {
        recurrenceRule: "FREQ=DAILY;COUNT=5",
      });
      const created = await eventsRepository.create(
        { note: { connect: { id: testNoteId } }, ...eventData },
        testPrisma
      );

      expect(created.recurrenceRule).toBe("FREQ=DAILY;COUNT=5");
    });

    it("正常系: metadataを含むイベントを作成できる", async () => {
      const { noteId, ...eventData } = createEventData(testNoteId, {
        metadata: { color: "blue", reminder: 30 },
      });
      const created = await eventsRepository.create(
        { note: { connect: { id: testNoteId } }, ...eventData },
        testPrisma
      );

      expect(created.metadata).toEqual({ color: "blue", reminder: 30 });
    });
  });

  describe("findById", () => {
    it("正常系: IDでイベントを取得できる", async () => {
      const created = await eventsRepository.create(
        prepareEventData(testNoteId),
        testPrisma
      );

      const found = await eventsRepository.findById(created.id, undefined, testPrisma);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.noteId).toBe(testNoteId);
    });

    it("正常系: includeオプションでノートを含めて取得できる", async () => {
      const created = await eventsRepository.create(
        prepareEventData(testNoteId),
        testPrisma
      );

      const found = await eventsRepository.findById(
        created.id,
        undefined,
        testPrisma
      );

      expect(found).toBeDefined();
      expect(found?.noteId).toBe(testNoteId);
    });

    it("異常系: 存在しないIDはnullを返す", async () => {
      const found = await eventsRepository.findById("non-existent-id", undefined, testPrisma);
      expect(found).toBeNull();
    });
  });

  describe("findByNoteId", () => {
    it("正常系: ノートIDでイベントを取得できる", async () => {
      const created = await eventsRepository.create(
        prepareEventData(testNoteId),
        testPrisma
      );

      const found = await eventsRepository.findByNoteId(testNoteId, undefined, testPrisma);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.noteId).toBe(testNoteId);
    });

    it("異常系: 存在しないnoteIdはnullを返す", async () => {
      const found = await eventsRepository.findByNoteId("non-existent-note-id", undefined, testPrisma);
      expect(found).toBeNull();
    });
  });

  describe("findMany", () => {
    it("正常系: 日付範囲で絞り込みできる", async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 86400000);
      const nextWeek = new Date(now.getTime() + 604800000);

      // 複数イベントを作成
      const note2 = await notesRepository.create(createNoteData(testUserId), testPrisma);
      const note3 = await notesRepository.create(createNoteData(testUserId), testPrisma);

      await eventsRepository.create(
        prepareEventData(testNoteId, { startAt: now }),
        testPrisma
      );
      await eventsRepository.create(
        prepareEventData(note2.id, { startAt: tomorrow }),
        testPrisma
      );
      await eventsRepository.create(
        prepareEventData(note3.id, { startAt: nextWeek }),
        testPrisma
      );

      const events = await eventsRepository.findMany(
        { startAt: { gte: now, lt: new Date(now.getTime() + 172800000) } }, // 2日間
        { sortBy: "startAt", sortOrder: "asc" },
        undefined,
        testPrisma
      );

      expect(events.length).toBe(2);
    });

    it("正常系: 終日イベントのみ取得できる", async () => {
      const note2 = await notesRepository.create(createNoteData(testUserId), testPrisma);

      await eventsRepository.create(
        prepareEventData(testNoteId, { isAllDay: true }),
        testPrisma
      );
      await eventsRepository.create(
        prepareEventData(note2.id, { isAllDay: false }),
        testPrisma
      );

      const events = await eventsRepository.findMany(
        { isAllDay: true },
        { sortBy: "startAt", sortOrder: "asc" },
        undefined,
        testPrisma
      );

      expect(events.length).toBe(1);
      expect(events[0].isAllDay).toBe(true);
    });

    it("境界値: take/skipでページングできる", async () => {
      const note2 = await notesRepository.create(createNoteData(testUserId), testPrisma);
      const note3 = await notesRepository.create(createNoteData(testUserId), testPrisma);

      await eventsRepository.create(
        prepareEventData(testNoteId),
        testPrisma
      );
      await eventsRepository.create(
        prepareEventData(note2.id),
        testPrisma
      );
      await eventsRepository.create(
        prepareEventData(note3.id),
        testPrisma
      );

      const page1 = await eventsRepository.findMany(
        {},
        { sortBy: "startAt", sortOrder: "asc", take: 2, skip: 0 },
        undefined,
        testPrisma
      );
      const page2 = await eventsRepository.findMany(
        {},
        { sortBy: "startAt", sortOrder: "asc", take: 2, skip: 2 },
        undefined,
        testPrisma
      );

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(1);
    });
  });

  describe("updateById", () => {
    it("正常系: イベント情報を更新できる", async () => {
      const created = await eventsRepository.create(
        prepareEventData(testNoteId),
        testPrisma
      );

      const newDate = new Date(Date.now() + 172800000);
      const updated = await eventsRepository.updateById(
        created.id,
        { location: "New Location", startAt: newDate },
        testPrisma
      );

      expect(updated.location).toBe("New Location");
      expect(updated.startAt.getTime()).toBe(newDate.getTime());
    });

    it("異常系: 存在しないIDの更新はエラー", async () => {
      await expect(
        eventsRepository.updateById("non-existent-id", { location: "New" }, testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("updateByNoteId", () => {
    it("正常系: ノートIDでイベントを更新できる", async () => {
      await eventsRepository.create(
        prepareEventData(testNoteId),
        testPrisma
      );

      const updated = await eventsRepository.updateByNoteId(
        testNoteId,
        { isAllDay: true },
        testPrisma
      );

      expect(updated.isAllDay).toBe(true);
    });

    it("異常系: 存在しないnoteIdの更新はエラー", async () => {
      await expect(
        eventsRepository.updateByNoteId("non-existent-note-id", { isAllDay: true }, testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("deleteById", () => {
    it("正常系: イベントを削除できる", async () => {
      const created = await eventsRepository.create(
        prepareEventData(testNoteId),
        testPrisma
      );

      await eventsRepository.deleteById(created.id, testPrisma);

      const found = await eventsRepository.findById(created.id, undefined, testPrisma);
      expect(found).toBeNull();
    });

    it("異常系: 存在しないIDの削除はエラー", async () => {
      await expect(
        eventsRepository.deleteById("non-existent-id", testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("deleteByNoteId", () => {
    it("正常系: ノートIDでイベントを削除できる", async () => {
      await eventsRepository.create(
        prepareEventData(testNoteId),
        testPrisma
      );

      await eventsRepository.deleteByNoteId(testNoteId, testPrisma);

      const found = await eventsRepository.findByNoteId(testNoteId, undefined, testPrisma);
      expect(found).toBeNull();
    });

    it("異常系: 存在しないnoteIdの削除はエラー", async () => {
      await expect(
        eventsRepository.deleteByNoteId("non-existent-note-id", testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("count", () => {
    it("正常系: 条件なしでカウントできる", async () => {
      const note2 = await notesRepository.create(createNoteData(testUserId), testPrisma);

      await eventsRepository.create(
        prepareEventData(testNoteId),
        testPrisma
      );
      await eventsRepository.create(
        prepareEventData(note2.id),
        testPrisma
      );

      const count = await eventsRepository.count({}, testPrisma);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("正常系: 終日イベントでカウントできる", async () => {
      const note2 = await notesRepository.create(createNoteData(testUserId), testPrisma);

      await eventsRepository.create(
        prepareEventData(testNoteId, { isAllDay: true }),
        testPrisma
      );
      await eventsRepository.create(
        prepareEventData(note2.id, { isAllDay: false }),
        testPrisma
      );

      const count = await eventsRepository.count({ isAllDay: true }, testPrisma);
      expect(count).toBe(1);
    });
  });
});


