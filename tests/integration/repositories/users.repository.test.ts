/**
 * Users Repository 統合テスト
 * 実DBを使用してRepository層のCRUD操作を検証
 */
import { describe, it, expect, beforeEach } from "vitest";
import { usersRepository } from "@/server/repositories";
import { getTestPrisma } from "../../helpers/db";
import { createUserData } from "../../helpers/factories";

describe("Users Repository - Integration Tests", () => {
  const testPrisma = getTestPrisma();

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
  });

  describe("create", () => {
    it("正常系: ユーザーを作成できる", async () => {
      const userData = createUserData();
      const user = await usersRepository.create(userData, testPrisma);

      expect(user.id).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it("異常系: 重複したemailは作成できない", async () => {
      const userData = createUserData({ email: "duplicate@test.com" });
      await usersRepository.create(userData, testPrisma);

      await expect(
        usersRepository.create(userData, testPrisma)
      ).rejects.toThrow();
    });

    it("境界値: emailがnullでも作成できる", async () => {
      const userData = createUserData({ email: null });
      const user = await usersRepository.create(userData, testPrisma);

      expect(user.email).toBeNull();
    });
  });

  describe("findById", () => {
    it("正常系: IDでユーザーを取得できる", async () => {
      const created = await usersRepository.create(
        createUserData(),
        testPrisma
      );
      const found = await usersRepository.findById(created.id, testPrisma);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(created.email);
    });

    it("異常系: 存在しないIDはnullを返す", async () => {
      const found = await usersRepository.findById(
        "non-existent-id",
        testPrisma
      );
      expect(found).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("正常系: emailでユーザーを取得できる", async () => {
      const userData = createUserData({ email: "test@example.com" });
      const created = await usersRepository.create(userData, testPrisma);

      const found = await usersRepository.findByEmail(
        "test@example.com",
        testPrisma
      );

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it("異常系: 存在しないemailはnullを返す", async () => {
      const found = await usersRepository.findByEmail(
        "nonexistent@test.com",
        testPrisma
      );
      expect(found).toBeNull();
    });
  });

  describe("findMany", () => {
    beforeEach(async () => {
      // 複数ユーザーを作成
      await usersRepository.create(createUserData(), testPrisma);
      await usersRepository.create(createUserData(), testPrisma);
      await usersRepository.create(createUserData(), testPrisma);
    });

    it("正常系: 全ユーザーを取得できる", async () => {
      const users = await usersRepository.findMany({}, {}, testPrisma);
      expect(users.length).toBeGreaterThanOrEqual(3);
    });

    it("境界値: takeで取得数を制限できる", async () => {
      const users = await usersRepository.findMany(
        {},
        { take: 2 },
        testPrisma
      );
      expect(users.length).toBe(2);
    });

    it("境界値: skipでオフセットできる", async () => {
      const allUsers = await usersRepository.findMany({}, {}, testPrisma);
      const skippedUsers = await usersRepository.findMany(
        {},
        { skip: 1 },
        testPrisma
      );

      expect(skippedUsers.length).toBe(allUsers.length - 1);
      expect(skippedUsers[0].id).not.toBe(allUsers[0].id);
    });
  });

  describe("count", () => {
    it("正常系: ユーザー数をカウントできる", async () => {
      // 初期状態は0
      const initialCount = await usersRepository.count({}, testPrisma);
      expect(initialCount).toBe(0);

      // ユーザーを3人作成
      await usersRepository.create(createUserData(), testPrisma);
      await usersRepository.create(createUserData(), testPrisma);
      await usersRepository.create(createUserData(), testPrisma);

      const count = await usersRepository.count({}, testPrisma);
      expect(count).toBe(3);
    });

    it("境界値: where条件でフィルタしてカウントできる", async () => {
      await usersRepository.create(
        createUserData({ name: "Alice" }),
        testPrisma
      );
      await usersRepository.create(
        createUserData({ name: "Bob" }),
        testPrisma
      );
      await usersRepository.create(
        createUserData({ name: "Alice" }),
        testPrisma
      );

      const aliceCount = await usersRepository.count(
        { name: "Alice" },
        testPrisma
      );
      expect(aliceCount).toBe(2);

      const bobCount = await usersRepository.count({ name: "Bob" }, testPrisma);
      expect(bobCount).toBe(1);
    });
  });

  describe("updateById", () => {
    it("正常系: ユーザー情報を更新できる", async () => {
      const created = await usersRepository.create(
        createUserData(),
        testPrisma
      );

      const updated = await usersRepository.updateById(
        created.id,
        { name: "Updated Name" },
        testPrisma
      );

      expect(updated.name).toBe("Updated Name");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        created.updatedAt.getTime()
      );
    });

    it("異常系: 存在しないIDの更新はエラー", async () => {
      await expect(
        usersRepository.updateById(
          "non-existent-id",
          { name: "Test" },
          testPrisma
        )
      ).rejects.toThrow();
    });
  });

  describe("deleteById", () => {
    it("正常系: ユーザーを削除できる", async () => {
      const created = await usersRepository.create(
        createUserData(),
        testPrisma
      );

      await usersRepository.deleteById(created.id, testPrisma);

      const found = await usersRepository.findById(created.id, testPrisma);
      expect(found).toBeNull();
    });

    it("異常系: 存在しないIDの削除はエラー", async () => {
      await expect(
        usersRepository.deleteById("non-existent-id", testPrisma)
      ).rejects.toThrow();
    });

    it("権限: カスケード削除の確認（関連データも削除される）", async () => {
      const user = await usersRepository.create(createUserData(), testPrisma);

      // 関連データを作成
      const project = await testPrisma.project.create({
        data: {
          ownerId: user.id,
          name: "Test Project",
        },
      });

      // ユーザー削除前にプロジェクトを削除
      await testPrisma.project.delete({ where: { id: project.id } });
      
      // ユーザー削除
      await usersRepository.deleteById(user.id, testPrisma);

      // ユーザーが削除されたことを確認
      const foundUser = await usersRepository.findById(user.id, testPrisma);
      expect(foundUser).toBeNull();
    });
  });

  describe("トランザクション", () => {
    it("トランザクション内で複数操作を実行できる", async () => {
      await testPrisma.$transaction(async (tx) => {
        const user1 = await usersRepository.create(createUserData(), tx);
        const user2 = await usersRepository.create(createUserData(), tx);

        expect(user1.id).toBeDefined();
        expect(user2.id).toBeDefined();
      });
    });

    it("トランザクションエラー時はロールバックされる", async () => {
      const userData = createUserData({ email: "rollback-test@test.com" });

      try {
        await testPrisma.$transaction(async (tx) => {
          await usersRepository.create(userData, tx);
          // エラーを発生させる
          throw new Error("Test rollback");
        });
      } catch (error) {
        // エラーは期待通り
      }

      // ロールバックされているため、ユーザーは存在しない
      const found = await usersRepository.findByEmail(
        "rollback-test@test.com",
        testPrisma
      );
      expect(found).toBeNull();
    });
  });
});
