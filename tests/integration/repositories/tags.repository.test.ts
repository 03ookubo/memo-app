/**
 * Tags Repository - Integration Tests
 * 実際のデータベースを使用してタグリポジトリの動作を検証
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { tagsRepository, usersRepository } from "@/server/repositories";
import { TagScope } from "@prisma/client";
import { createUserData, createTagData } from "../../helpers/factories";
import { getTestPrisma } from "../../helpers/db";

describe("Tags Repository - Integration Tests", () => {
  const testPrisma = getTestPrisma();
  let testUserId: string;

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
    
    // テスト用ユーザーを作成
    const user = await usersRepository.create(createUserData(), testPrisma);
    testUserId = user.id;
  });

  describe("create", () => {
    it("正常系: ユーザースコープのタグを作成できる", async () => {
      const tagData = createTagData(testUserId, TagScope.USER);
      const created = await tagsRepository.create(tagData, testPrisma);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.ownerId).toBe(testUserId);
      expect(created.scope).toBe(TagScope.USER);
      expect(created.name).toBe(tagData.name);
    });

    it("正常系: システムスコープのタグを作成できる", async () => {
      const tagData = createTagData(null, TagScope.SYSTEM);
      const created = await tagsRepository.create(tagData, testPrisma);

      expect(created.scope).toBe(TagScope.SYSTEM);
      expect(created.ownerId).toBeNull();
    });

    it("正常系: プリセットタグを作成できる", async () => {
      const tagData = createTagData(testUserId, TagScope.USER, {
        isPreset: true,
      });
      const created = await tagsRepository.create(tagData, testPrisma);

      expect(created.isPreset).toBe(true);
    });
  });

  describe("findById", () => {
    it("正常系: IDでタグを取得できる", async () => {
      const created = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      const found = await tagsRepository.findById(created.id, undefined, testPrisma);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(created.name);
    });

    it("異常系: 存在しないIDはnullを返す", async () => {
      const found = await tagsRepository.findById("non-existent-id", undefined, testPrisma);
      expect(found).toBeNull();
    });
  });

  describe("findMany", () => {
    beforeEach(async () => {
      // 複数タグを作成
      await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );
      await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );
      await tagsRepository.create(
        createTagData(null, TagScope.SYSTEM),
        testPrisma
      );
    });

    it("正常系: オーナーIDで絞り込み検索できる", async () => {
      const tags = await tagsRepository.findMany(
        { ownerId: testUserId },
        {},
        undefined,
        testPrisma
      );

      expect(tags.length).toBeGreaterThanOrEqual(2);
      expect(tags.every((t) => t.ownerId === testUserId)).toBe(true);
    });

    it("正常系: スコープで絞り込みできる", async () => {
      const systemTags = await tagsRepository.findMany(
        { scope: TagScope.SYSTEM },
        {},
        undefined,
        testPrisma
      );

      expect(systemTags.length).toBeGreaterThan(0);
      expect(systemTags.every((t) => t.scope === TagScope.SYSTEM)).toBe(true);
    });

    it("境界値: take/skipでページングできる", async () => {
      const allTags = await tagsRepository.findMany(
        { ownerId: testUserId },
        {},
        undefined,
        testPrisma
      );

      const pagedTags = await tagsRepository.findMany(
        { ownerId: testUserId },
        { take: 1, skip: 1 },
        undefined,
        testPrisma
      );

      expect(pagedTags.length).toBeLessThanOrEqual(1);
      if (allTags.length > 1) {
        expect(pagedTags[0].id).toBe(allTags[1].id);
      }
    });
  });

  describe("updateById", () => {
    it("正常系: タグ情報を更新できる", async () => {
      const created = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      const updated = await tagsRepository.updateById(
        created.id,
        { name: "Updated Tag", description: "Updated Description" },
        testPrisma
      );

      expect(updated.name).toBe("Updated Tag");
      expect(updated.description).toBe("Updated Description");
    });

    it("異常系: 存在しないIDの更新はエラー", async () => {
      await expect(
        tagsRepository.updateById(
          "non-existent-id",
          { name: "Test" },
          testPrisma
        )
      ).rejects.toThrow();
    });
  });

  describe("deleteById", () => {
    it("正常系: タグを削除できる", async () => {
      const created = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      await tagsRepository.deleteById(created.id, testPrisma);

      const found = await tagsRepository.findById(created.id, undefined, testPrisma);
      expect(found).toBeNull();
    });

    it("異常系: 存在しないIDの削除はエラー", async () => {
      await expect(
        tagsRepository.deleteById("non-existent-id", testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );
      await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );
    });

    it("正常系: 条件なしでカウントできる", async () => {
      const count = await tagsRepository.count({}, testPrisma);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("正常系: オーナーIDでカウントできる", async () => {
      const count = await tagsRepository.count(
        { ownerId: testUserId },
        testPrisma
      );
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });
});
