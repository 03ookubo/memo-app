/**
 * Integrations Repository - Integration Tests
 * 実際のデータベースを使用して統合リポジトリの動作を検証
 */

import { describe, it, expect, beforeEach } from "vitest";
import { integrationsRepository, usersRepository } from "@/server/repositories";
import { createUserData, createIntegrationData } from "../../helpers/factories";
import { getTestPrisma } from "../../helpers/db";

describe("Integrations Repository - Integration Tests", () => {
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
    it("正常系: Google統合を作成できる", async () => {
      const integrationData = createIntegrationData(testUserId, "google");
      const created = await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData.accessToken,
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.userId).toBe(testUserId);
      expect(created.provider).toBe("google");
      expect(created.accessToken).toBe(integrationData.accessToken);
    });

    it("正常系: GitHub統合を作成できる", async () => {
      const integrationData = createIntegrationData(testUserId, "github");
      const created = await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "github",
          accessToken: integrationData.accessToken,
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      expect(created.provider).toBe("github");
    });

    it("正常系: refreshTokenなしの統合を作成できる", async () => {
      const integrationData = createIntegrationData(testUserId, "notion", {
        refreshToken: null,
      });
      const created = await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "notion",
          accessToken: integrationData.accessToken,
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      expect(created.refreshToken).toBeNull();
    });
  });

  describe("findById", () => {
    it("正常系: IDで統合情報を取得できる", async () => {
      const integrationData = createIntegrationData(testUserId, "google");
      const created = await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData.accessToken,
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      const found = await integrationsRepository.findById(created.id, undefined, testPrisma);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.provider).toBe("google");
    });

    it("正常系: includeオプションでユーザーを含めて取得できる", async () => {
      const integrationData = createIntegrationData(testUserId, "google");
      const created = await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData.accessToken,
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      const found = await integrationsRepository.findById(
        created.id,
        undefined,
        testPrisma
      );

      expect(found).toBeDefined();
      expect(found?.userId).toBe(testUserId);
    });

    it("異常系: 存在しないIDはnullを返す", async () => {
      const found = await integrationsRepository.findById("non-existent-id", undefined, testPrisma);
      expect(found).toBeNull();
    });
  });

  describe("findByUserIdAndProvider", () => {
    it("正常系: ユーザーIDとプロバイダーで統合情報を取得できる", async () => {
      const integrationData = createIntegrationData(testUserId, "google");
      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData.accessToken,
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      const found = await integrationsRepository.findByUserIdAndProvider(
        testUserId,
        "google",
        undefined,
        testPrisma
      );

      expect(found).toBeDefined();
      expect(found?.userId).toBe(testUserId);
      expect(found?.provider).toBe("google");
    });

    it("異常系: 存在しないプロバイダーはnullを返す", async () => {
      const found = await integrationsRepository.findByUserIdAndProvider(
        testUserId,
        "non-existent-provider",
        undefined,
        testPrisma
      );
      expect(found).toBeNull();
    });
  });

  describe("findMany", () => {
    it("正常系: ユーザーIDで絞り込み検索できる", async () => {
      const user2 = await usersRepository.create(createUserData(), testPrisma);

      const integrationData1 = createIntegrationData(testUserId, "google");
      const integrationData2 = createIntegrationData(testUserId, "github");
      const integrationData3 = createIntegrationData(user2.id, "notion");

      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData1.accessToken,
          refreshToken: integrationData1.refreshToken,
          expiresAt: integrationData1.expiresAt,
          metadata: integrationData1.metadata,
        },
        testPrisma
      );
      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "github",
          accessToken: integrationData2.accessToken,
          refreshToken: integrationData2.refreshToken,
          expiresAt: integrationData2.expiresAt,
          metadata: integrationData2.metadata,
        },
        testPrisma
      );
      await integrationsRepository.create(
        {
          user: { connect: { id: user2.id } },
          provider: "notion",
          accessToken: integrationData3.accessToken,
          refreshToken: integrationData3.refreshToken,
          expiresAt: integrationData3.expiresAt,
          metadata: integrationData3.metadata,
        },
        testPrisma
      );

      const integrations = await integrationsRepository.findMany(
        { userId: testUserId },
        { sortBy: "createdAt", sortOrder: "asc" },
        undefined,
        testPrisma
      );

      expect(integrations.length).toBe(2);
      expect(integrations.every((i) => i.userId === testUserId)).toBe(true);
    });

    it("境界値: take/skipでページングできる", async () => {
      const integrationData1 = createIntegrationData(testUserId, "google");
      const integrationData2 = createIntegrationData(testUserId, "github");
      const integrationData3 = createIntegrationData(testUserId, "notion");

      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData1.accessToken,
          refreshToken: integrationData1.refreshToken,
          expiresAt: integrationData1.expiresAt,
          metadata: integrationData1.metadata,
        },
        testPrisma
      );
      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "github",
          accessToken: integrationData2.accessToken,
          refreshToken: integrationData2.refreshToken,
          expiresAt: integrationData2.expiresAt,
          metadata: integrationData2.metadata,
        },
        testPrisma
      );
      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "notion",
          accessToken: integrationData3.accessToken,
          refreshToken: integrationData3.refreshToken,
          expiresAt: integrationData3.expiresAt,
          metadata: integrationData3.metadata,
        },
        testPrisma
      );

      const page1 = await integrationsRepository.findMany(
        { userId: testUserId },
        { sortBy: "createdAt", sortOrder: "asc", take: 2, skip: 0 },
        undefined,
        testPrisma
      );
      const page2 = await integrationsRepository.findMany(
        { userId: testUserId },
        { sortBy: "createdAt", sortOrder: "asc", take: 2, skip: 2 },
        undefined,
        testPrisma
      );

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(1);
    });
  });

  describe("upsert", () => {
    it("正常系: 存在しない場合は新規作成される", async () => {
      const integrationData = createIntegrationData(testUserId, "google");
      const result = await integrationsRepository.upsert(
        testUserId,
        "google",
        {
          accessToken: integrationData.accessToken,
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.provider).toBe("google");
    });

    it("正常系: 存在する場合は更新される", async () => {
      const integrationData = createIntegrationData(testUserId, "google");
      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: "old-token",
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      const result = await integrationsRepository.upsert(
        testUserId,
        "google",
        {
          accessToken: "new-token",
        },
        testPrisma
      );

      expect(result.accessToken).toBe("new-token");
    });
  });

  describe("updateById", () => {
    it("正常系: 統合情報を更新できる", async () => {
      const integrationData = createIntegrationData(testUserId, "google");
      const created = await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData.accessToken,
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      const updated = await integrationsRepository.updateById(
        created.id,
        { accessToken: "updated-token" },
        testPrisma
      );

      expect(updated.accessToken).toBe("updated-token");
    });

    it("異常系: 存在しないIDの更新はエラー", async () => {
      await expect(
        integrationsRepository.updateById("non-existent-id", { accessToken: "new" }, testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("deleteById", () => {
    it("正常系: 統合情報を削除できる", async () => {
      const integrationData = createIntegrationData(testUserId, "google");
      const created = await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData.accessToken,
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      await integrationsRepository.deleteById(created.id, testPrisma);

      const found = await integrationsRepository.findById(created.id, undefined, testPrisma);
      expect(found).toBeNull();
    });

    it("異常系: 存在しないIDの削除はエラー", async () => {
      await expect(
        integrationsRepository.deleteById("non-existent-id", testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("deleteByUserIdAndProvider", () => {
    it("正常系: ユーザーIDとプロバイダーで削除できる", async () => {
      const integrationData = createIntegrationData(testUserId, "google");
      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData.accessToken,
          refreshToken: integrationData.refreshToken,
          expiresAt: integrationData.expiresAt,
          metadata: integrationData.metadata,
        },
        testPrisma
      );

      await integrationsRepository.deleteByUserIdAndProvider(testUserId, "google", testPrisma);

      const found = await integrationsRepository.findByUserIdAndProvider(
        testUserId,
        "google",
        undefined,
        testPrisma
      );
      expect(found).toBeNull();
    });

    it("異常系: 存在しないプロバイダーの削除はエラー", async () => {
      await expect(
        integrationsRepository.deleteByUserIdAndProvider(testUserId, "non-existent", testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("count", () => {
    it("正常系: 条件なしでカウントできる", async () => {
      const integrationData1 = createIntegrationData(testUserId, "google");
      const integrationData2 = createIntegrationData(testUserId, "github");

      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData1.accessToken,
          refreshToken: integrationData1.refreshToken,
          expiresAt: integrationData1.expiresAt,
          metadata: integrationData1.metadata,
        },
        testPrisma
      );
      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "github",
          accessToken: integrationData2.accessToken,
          refreshToken: integrationData2.refreshToken,
          expiresAt: integrationData2.expiresAt,
          metadata: integrationData2.metadata,
        },
        testPrisma
      );

      const count = await integrationsRepository.count({}, testPrisma);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("正常系: ユーザーIDでカウントできる", async () => {
      const integrationData1 = createIntegrationData(testUserId, "google");
      const integrationData2 = createIntegrationData(testUserId, "github");

      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "google",
          accessToken: integrationData1.accessToken,
          refreshToken: integrationData1.refreshToken,
          expiresAt: integrationData1.expiresAt,
          metadata: integrationData1.metadata,
        },
        testPrisma
      );
      await integrationsRepository.create(
        {
          user: { connect: { id: testUserId } },
          provider: "github",
          accessToken: integrationData2.accessToken,
          refreshToken: integrationData2.refreshToken,
          expiresAt: integrationData2.expiresAt,
          metadata: integrationData2.metadata,
        },
        testPrisma
      );

      const count = await integrationsRepository.count({ userId: testUserId }, testPrisma);
      expect(count).toBe(2);
    });
  });
});
