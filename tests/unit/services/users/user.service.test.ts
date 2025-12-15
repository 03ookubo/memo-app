/**
 * User Service Unit Tests
 * Repositoryをモック化したユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { User } from "@prisma/client";
import * as UserService from "@/server/services/users/user.service";
import { usersRepository } from "@/server/repositories";

// Repositoryをモック化
vi.mock("@/server/repositories", () => ({
  usersRepository: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
    count: vi.fn(),
  },
}));

describe("UserService", () => {
  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    settings: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("countUsers", () => {
    it("ユーザー数を取得できる", async () => {
      vi.mocked(usersRepository.count).mockResolvedValue(5);

      const result = await UserService.countUsers();

      expect(result).toBe(5);
      expect(usersRepository.count).toHaveBeenCalledWith({});
    });

    it("ユーザーがいない場合は0を返す", async () => {
      vi.mocked(usersRepository.count).mockResolvedValue(0);

      const result = await UserService.countUsers();

      expect(result).toBe(0);
    });
  });

  describe("listUsers", () => {
    it("ユーザー一覧を取得できる", async () => {
      vi.mocked(usersRepository.findMany).mockResolvedValue([mockUser]);
      vi.mocked(usersRepository.count).mockResolvedValue(1);

      const result = await UserService.listUsers({});

      expect(result.data).toEqual([mockUser]);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it("ページネーションが適用される", async () => {
      vi.mocked(usersRepository.findMany).mockResolvedValue([mockUser]);
      vi.mocked(usersRepository.count).mockResolvedValue(10);

      const result = await UserService.listUsers({
        pagination: { page: 2, limit: 5 },
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.total).toBe(10);
      expect(usersRepository.findMany).toHaveBeenCalledWith(
        {},
        { take: 5, skip: 5 }
      );
    });
  });

  describe("getUserById", () => {
    it("IDでユーザーを取得できる", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(mockUser);

      const result = await UserService.getUserById("user-123");

      expect(result).toEqual(mockUser);
      expect(usersRepository.findById).toHaveBeenCalledWith("user-123");
    });

    it("存在しないユーザーはNOT_FOUNDエラー", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(null);

      await expect(UserService.getUserById("nonexistent")).rejects.toThrow(
        "ユーザーが見つかりません"
      );
    });
  });

  describe("createUser", () => {
    it("ユーザーを作成できる", async () => {
      vi.mocked(usersRepository.create).mockResolvedValue(mockUser);

      const result = await UserService.createUser();

      expect(result).toEqual(mockUser);
      expect(usersRepository.create).toHaveBeenCalledWith({});
    });
  });

  describe("deleteUser", () => {
    it("ユーザーを削除できる", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(usersRepository.deleteById).mockResolvedValue(mockUser);

      await UserService.deleteUser("user-123");

      expect(usersRepository.deleteById).toHaveBeenCalledWith("user-123");
    });

    it("存在しないユーザーはNOT_FOUNDエラー", async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(null);

      await expect(UserService.deleteUser("nonexistent")).rejects.toThrow(
        "ユーザーが見つかりません"
      );
    });
  });
});
