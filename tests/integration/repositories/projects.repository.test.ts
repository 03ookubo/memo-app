/**
 * Projects Repository - Integration Tests
 * 実際のデータベースを使用してプロジェクトリポジトリの動作を検証
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { projectsRepository, usersRepository } from "@/server/repositories";
import { createUserData, createProjectData } from "../../helpers/factories";
import { getTestPrisma } from "../../helpers/db";

describe("Projects Repository - Integration Tests", () => {
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
    it("正常系: 基本的なプロジェクトを作成できる", async () => {
      const projectData = createProjectData(testUserId);
      const created = await projectsRepository.create(projectData, testPrisma);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.ownerId).toBe(testUserId);
      expect(created.name).toBe(projectData.name);
      expect(created.description).toBe(projectData.description);
    });

    it("正常系: 説明なしのプロジェクトを作成できる", async () => {
      const projectData = createProjectData(testUserId, { description: null });
      const created = await projectsRepository.create(projectData, testPrisma);

      expect(created.description).toBeNull();
    });

    it("正常系: emojiなしのプロジェクトを作成できる", async () => {
      const projectData = createProjectData(testUserId, { emoji: null });
      const created = await projectsRepository.create(projectData, testPrisma);

      expect(created.emoji).toBeNull();
    });
  });

  describe("findById", () => {
    it("正常系: IDでプロジェクトを取得できる", async () => {
      const created = await projectsRepository.create(
        createProjectData(testUserId),
        testPrisma
      );

      const found = await projectsRepository.findById(created.id, undefined, testPrisma);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(created.name);
    });

    it("異常系: 存在しないIDはnullを返す", async () => {
      const found = await projectsRepository.findById(
        "non-existent-id",
        undefined,
        testPrisma
      );

      expect(found).toBeNull();
    });
  });

  describe("findMany", () => {
    beforeEach(async () => {
      // 複数プロジェクトを作成
      await projectsRepository.create(createProjectData(testUserId), testPrisma);
      await projectsRepository.create(createProjectData(testUserId), testPrisma);
      await projectsRepository.create(createProjectData(testUserId), testPrisma);
    });

    it("正常系: オーナーIDで絞り込み検索できる", async () => {
      const projects = await projectsRepository.findMany(
        { ownerId: testUserId },
        {},
        undefined,
        testPrisma
      );

      expect(projects.length).toBeGreaterThanOrEqual(3);
      expect(projects.every((p) => p.ownerId === testUserId)).toBe(true);
    });

    it("境界値: take/skipでページングできる", async () => {
      const allProjects = await projectsRepository.findMany(
        { ownerId: testUserId },
        {},
        undefined,
        testPrisma
      );

      const pagedProjects = await projectsRepository.findMany(
        { ownerId: testUserId },
        { take: 2, skip: 1 },
        undefined,
        testPrisma
      );

      expect(pagedProjects.length).toBeLessThanOrEqual(2);
      if (allProjects.length > 1) {
        expect(pagedProjects[0].id).toBe(allProjects[1].id);
      }
    });

    it("正常系: 名前でソートできる", async () => {
      const projects = await projectsRepository.findMany(
        { ownerId: testUserId },
        { sortBy: "name", sortOrder: "asc" },
        undefined,
        testPrisma
      );

      expect(projects.length).toBeGreaterThan(0);
      for (let i = 1; i < projects.length; i++) {
        expect(projects[i].name >= projects[i - 1].name).toBe(true);
      }
    });
  });

  describe("updateById", () => {
    it("正常系: プロジェクト情報を更新できる", async () => {
      const created = await projectsRepository.create(
        createProjectData(testUserId),
        testPrisma
      );

      const updated = await projectsRepository.updateById(
        created.id,
        { name: "Updated Name", description: "Updated Description" },
        testPrisma
      );

      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("Updated Description");
    });

    it("正常系: 部分的な更新ができる", async () => {
      const created = await projectsRepository.create(
        createProjectData(testUserId),
        testPrisma
      );

      const updated = await projectsRepository.updateById(
        created.id,
        { description: "New Description" },
        testPrisma
      );

      expect(updated.name).toBe(created.name); // 変更なし
      expect(updated.description).toBe("New Description");
    });

    it("異常系: 存在しないIDの更新はエラー", async () => {
      await expect(
        projectsRepository.updateById(
          "non-existent-id",
          { name: "Test" },
          testPrisma
        )
      ).rejects.toThrow();
    });
  });

  describe("deleteById", () => {
    it("正常系: プロジェクトを削除できる", async () => {
      const created = await projectsRepository.create(
        createProjectData(testUserId),
        testPrisma
      );

      await projectsRepository.deleteById(created.id, testPrisma);

      const found = await projectsRepository.findById(created.id, undefined, testPrisma);
      expect(found).toBeNull();
    });

    it("異常系: 存在しないIDの削除はエラー", async () => {
      await expect(
        projectsRepository.deleteById("non-existent-id", testPrisma)
      ).rejects.toThrow();
    });

    it("権限: プロジェクト削除時に関連ノートのprojectIdがNULLになる", async () => {
      const project = await projectsRepository.create(
        createProjectData(testUserId),
        testPrisma
      );

      // プロジェクトに紐づくノートを作成
      const note = await testPrisma.note.create({
        data: {
          ownerId: testUserId,
          projectId: project.id,
          title: "Test Note",
        },
      });

      // プロジェクトを削除
      await projectsRepository.deleteById(project.id, testPrisma);

      // ノートのprojectIdがNULLになっていることを確認
      const foundNote = await testPrisma.note.findUnique({
        where: { id: note.id },
      });
      expect(foundNote?.projectId).toBeNull();
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      await projectsRepository.create(createProjectData(testUserId), testPrisma);
      await projectsRepository.create(createProjectData(testUserId), testPrisma);
    });

    it("正常系: 条件なしでカウントできる", async () => {
      const count = await projectsRepository.count({}, testPrisma);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("正常系: オーナーIDでカウントできる", async () => {
      const count = await projectsRepository.count(
        { ownerId: testUserId },
        testPrisma
      );
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });
});
