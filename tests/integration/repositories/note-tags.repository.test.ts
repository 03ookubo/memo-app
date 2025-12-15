/**
 * NoteTags Repository - Integration Tests
 * 実際のデータベースを使用してノート・タグ関連リポジトリの動作を検証
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  noteTagsRepository,
  usersRepository,
  notesRepository,
  tagsRepository,
} from "@/server/repositories";
import { createUserData, createNoteData, createTagData } from "../../helpers/factories";
import { getTestPrisma } from "../../helpers/db";
import { TagScope } from "@prisma/client";

describe("NoteTags Repository - Integration Tests", () => {
  const testPrisma = getTestPrisma();
  let testUserId: string;
  let testNoteId: string;
  let testTagId: string;

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
    
    // テスト用ユーザー、ノート、タグを作成
    const user = await usersRepository.create(createUserData(), testPrisma);
    testUserId = user.id;
    
    const note = await notesRepository.create(
      createNoteData(testUserId),
      testPrisma
    );
    testNoteId = note.id;

    const tag = await tagsRepository.create(
      createTagData(testUserId, TagScope.USER),
      testPrisma
    );
    testTagId = tag.id;
  });

  describe("create", () => {
    it("正常系: ノートにタグを追加できる", async () => {
      const created = await noteTagsRepository.create(
        { noteId: testNoteId, tagId: testTagId },
        testPrisma
      );

      expect(created).toBeDefined();
      expect(created.noteId).toBe(testNoteId);
      expect(created.tagId).toBe(testTagId);
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it("異常系: 重複した関連は作成できない", async () => {
      await noteTagsRepository.create(
        { noteId: testNoteId, tagId: testTagId },
        testPrisma
      );

      await expect(
        noteTagsRepository.create(
          { noteId: testNoteId, tagId: testTagId },
          testPrisma
        )
      ).rejects.toThrow();
    });
  });

  describe("createMany", () => {
    it("正常系: 複数タグを一括追加できる", async () => {
      const tag2 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );
      const tag3 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      const result = await noteTagsRepository.createMany(
        testNoteId,
        [testTagId, tag2.id, tag3.id],
        testPrisma
      );

      expect(result.count).toBe(3);

      const noteTags = await noteTagsRepository.findByNoteId(testNoteId, testPrisma);
      expect(noteTags.length).toBe(3);
    });

    it("正常系: skipDuplicatesで重複をスキップできる", async () => {
      await noteTagsRepository.create(
        { noteId: testNoteId, tagId: testTagId },
        testPrisma
      );

      const tag2 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      // 重複を含むがエラーにならない
      const result = await noteTagsRepository.createMany(
        testNoteId,
        [testTagId, tag2.id],
        testPrisma
      );

      expect(result.count).toBe(1); // tag2のみ追加される

      const noteTags = await noteTagsRepository.findByNoteId(testNoteId, testPrisma);
      expect(noteTags.length).toBe(2);
    });
  });

  describe("findByNoteIdAndTagId", () => {
    it("正常系: ノートIDとタグIDで関連を取得できる", async () => {
      await noteTagsRepository.create(
        { noteId: testNoteId, tagId: testTagId },
        testPrisma
      );

      const found = await noteTagsRepository.findByNoteIdAndTagId(
        testNoteId,
        testTagId,
        testPrisma
      );

      expect(found).toBeDefined();
      expect(found?.noteId).toBe(testNoteId);
      expect(found?.tagId).toBe(testTagId);
    });

    it("異常系: 存在しない関連はnullを返す", async () => {
      const found = await noteTagsRepository.findByNoteIdAndTagId(
        testNoteId,
        "non-existent-tag-id",
        testPrisma
      );
      expect(found).toBeNull();
    });
  });

  describe("findByNoteId", () => {
    it("正常系: ノートIDで全ての関連タグを取得できる", async () => {
      const tag2 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );
      const tag3 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      await noteTagsRepository.createMany(
        testNoteId,
        [testTagId, tag2.id, tag3.id],
        testPrisma
      );

      const noteTags = await noteTagsRepository.findByNoteId(testNoteId, testPrisma);

      expect(noteTags.length).toBe(3);
      expect(noteTags.every((nt) => nt.noteId === testNoteId)).toBe(true);
    });

    it("正常系: タグがないノートは空配列を返す", async () => {
      const noteTags = await noteTagsRepository.findByNoteId(testNoteId, testPrisma);
      expect(noteTags).toEqual([]);
    });
  });

  describe("findByTagId", () => {
    it("正常系: タグIDで全ての関連ノートを取得できる", async () => {
      const note2 = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );
      const note3 = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      await noteTagsRepository.create(
        { noteId: testNoteId, tagId: testTagId },
        testPrisma
      );
      await noteTagsRepository.create(
        { noteId: note2.id, tagId: testTagId },
        testPrisma
      );
      await noteTagsRepository.create(
        { noteId: note3.id, tagId: testTagId },
        testPrisma
      );

      const noteTags = await noteTagsRepository.findByTagId(testTagId, testPrisma);

      expect(noteTags.length).toBe(3);
      expect(noteTags.every((nt) => nt.tagId === testTagId)).toBe(true);
    });

    it("正常系: 使用されていないタグは空配列を返す", async () => {
      const noteTags = await noteTagsRepository.findByTagId(testTagId, testPrisma);
      expect(noteTags).toEqual([]);
    });
  });

  describe("delete", () => {
    it("正常系: ノートからタグを削除できる", async () => {
      await noteTagsRepository.create(
        { noteId: testNoteId, tagId: testTagId },
        testPrisma
      );

      await noteTagsRepository.delete(
        { noteId: testNoteId, tagId: testTagId },
        testPrisma
      );

      const found = await noteTagsRepository.findByNoteIdAndTagId(
        testNoteId,
        testTagId,
        testPrisma
      );
      expect(found).toBeNull();
    });

    it("異常系: 存在しない関連の削除はエラー", async () => {
      await expect(
        noteTagsRepository.delete(
          { noteId: testNoteId, tagId: testTagId },
          testPrisma
        )
      ).rejects.toThrow();
    });
  });

  describe("deleteByNoteId", () => {
    it("正常系: ノートから全タグを削除できる", async () => {
      const tag2 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );
      const tag3 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      await noteTagsRepository.createMany(
        testNoteId,
        [testTagId, tag2.id, tag3.id],
        testPrisma
      );

      const result = await noteTagsRepository.deleteByNoteId(testNoteId, testPrisma);
      expect(result.count).toBe(3);

      const noteTags = await noteTagsRepository.findByNoteId(testNoteId, testPrisma);
      expect(noteTags.length).toBe(0);
    });

    it("正常系: タグがないノートは0件削除", async () => {
      const result = await noteTagsRepository.deleteByNoteId(testNoteId, testPrisma);
      expect(result.count).toBe(0);
    });
  });

  describe("deleteByTagId", () => {
    it("正常系: タグに紐づく全関連を削除できる", async () => {
      const note2 = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );
      const note3 = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      await noteTagsRepository.create(
        { noteId: testNoteId, tagId: testTagId },
        testPrisma
      );
      await noteTagsRepository.create(
        { noteId: note2.id, tagId: testTagId },
        testPrisma
      );
      await noteTagsRepository.create(
        { noteId: note3.id, tagId: testTagId },
        testPrisma
      );

      const result = await noteTagsRepository.deleteByTagId(testTagId, testPrisma);
      expect(result.count).toBe(3);

      const noteTags = await noteTagsRepository.findByTagId(testTagId, testPrisma);
      expect(noteTags.length).toBe(0);
    });

    it("正常系: 使用されていないタグは0件削除", async () => {
      const result = await noteTagsRepository.deleteByTagId(testTagId, testPrisma);
      expect(result.count).toBe(0);
    });
  });

  describe("countByNoteId", () => {
    it("正常系: ノートに紐づくタグ数をカウントできる", async () => {
      const tag2 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );
      const tag3 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      await noteTagsRepository.createMany(
        testNoteId,
        [testTagId, tag2.id, tag3.id],
        testPrisma
      );

      const count = await noteTagsRepository.countByNoteId(testNoteId, testPrisma);
      expect(count).toBe(3);
    });

    it("正常系: タグがないノートは0を返す", async () => {
      const count = await noteTagsRepository.countByNoteId(testNoteId, testPrisma);
      expect(count).toBe(0);
    });
  });

  describe("countByTagId", () => {
    it("正常系: タグが使用されているノート数をカウントできる", async () => {
      const note2 = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );
      const note3 = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      await noteTagsRepository.create(
        { noteId: testNoteId, tagId: testTagId },
        testPrisma
      );
      await noteTagsRepository.create(
        { noteId: note2.id, tagId: testTagId },
        testPrisma
      );
      await noteTagsRepository.create(
        { noteId: note3.id, tagId: testTagId },
        testPrisma
      );

      const count = await noteTagsRepository.countByTagId(testTagId, testPrisma);
      expect(count).toBe(3);
    });

    it("正常系: 使用されていないタグは0を返す", async () => {
      const count = await noteTagsRepository.countByTagId(testTagId, testPrisma);
      expect(count).toBe(0);
    });
  });

  describe("トランザクション", () => {
    it("正常系: トランザクション内で複数タグを操作できる", async () => {
      const tag2 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      await testPrisma.$transaction(async (tx) => {
        await noteTagsRepository.create(
          { noteId: testNoteId, tagId: testTagId },
          tx
        );
        await noteTagsRepository.create(
          { noteId: testNoteId, tagId: tag2.id },
          tx
        );
      });

      const noteTags = await noteTagsRepository.findByNoteId(testNoteId, testPrisma);
      expect(noteTags.length).toBe(2);
    });

    it("正常系: トランザクションエラー時はロールバックされる", async () => {
      const tag2 = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      await expect(
        testPrisma.$transaction(async (tx) => {
          await noteTagsRepository.create(
            { noteId: testNoteId, tagId: testTagId },
            tx
          );
          // 重複エラーで失敗
          await noteTagsRepository.create(
            { noteId: testNoteId, tagId: testTagId },
            tx
          );
        })
      ).rejects.toThrow();

      // ロールバックされているため何も作成されていない
      const noteTags = await noteTagsRepository.findByNoteId(testNoteId, testPrisma);
      expect(noteTags.length).toBe(0);
    });
  });
});
