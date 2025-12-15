/**
 * Tag Service Unit Tests
 * Repositoryをモック化したユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Tag, TagScope } from "@prisma/client";
import * as TagService from "@/server/services/tags/tag.service";
import { tagsRepository, noteTagsRepository } from "@/server/repositories";
import prisma from "@/lib/prisma";

// Repositoryをモック化
vi.mock("@/server/repositories", () => ({
  tagsRepository: {
    findById: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findByScopeAndName: vi.fn(),
    findByScopeAndColor: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
  },
  noteTagsRepository: {
    findByTagId: vi.fn(),
    deleteByTagId: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("TagService", () => {
  const mockUserId = "user-123";
  const mockTag: Tag = {
    id: "tag-123",
    scope: "USER",
    ownerId: mockUserId,
    name: "Important",
    color: "#ff0000",
    description: "Important notes",
    isPreset: false,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listTags", () => {
    it("全タグを取得できる", async () => {
      vi.mocked(tagsRepository.findMany).mockResolvedValue([mockTag]);
      vi.mocked(tagsRepository.count).mockResolvedValue(1);

      const result = await TagService.listTags({ ownerId: mockUserId });

      expect(result.data).toEqual([mockTag]);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(tagsRepository.findMany).toHaveBeenCalledWith(
        { ownerId: mockUserId },
        expect.objectContaining({ take: 20, skip: 0 })
      );
    });

    it("スコープでフィルタできる", async () => {
      vi.mocked(tagsRepository.findMany).mockResolvedValue([mockTag]);
      vi.mocked(tagsRepository.count).mockResolvedValue(1);

      await TagService.listTags({ ownerId: mockUserId, scope: "USER" });

      expect(tagsRepository.findMany).toHaveBeenCalledWith(
        { ownerId: mockUserId, scope: "USER" },
        expect.anything()
      );
    });
  });

  describe("listUserTags", () => {
    it("ユーザータグのみ取得できる", async () => {
      vi.mocked(tagsRepository.findMany).mockResolvedValue([mockTag]);
      vi.mocked(tagsRepository.count).mockResolvedValue(1);

      const result = await TagService.listUserTags(mockUserId);

      expect(result.data).toEqual([mockTag]);
      expect(tagsRepository.findMany).toHaveBeenCalledWith(
        { ownerId: mockUserId, scope: "USER" },
        expect.anything()
      );
    });
  });

  describe("listSystemTags", () => {
    it("システムタグのみ取得できる", async () => {
      const systemTag = { ...mockTag, scope: "SYSTEM" as TagScope, ownerId: null };
      vi.mocked(tagsRepository.findMany).mockResolvedValue([systemTag]);
      vi.mocked(tagsRepository.count).mockResolvedValue(1);

      const result = await TagService.listSystemTags();

      expect(result.data).toEqual([systemTag]);
      expect(tagsRepository.findMany).toHaveBeenCalledWith(
        { scope: "SYSTEM" },
        expect.anything()
      );
    });
  });

  describe("getTagById", () => {
    it("タグを取得できる", async () => {
      vi.mocked(tagsRepository.findById).mockResolvedValue(mockTag);

      const result = await TagService.getTagById("tag-123");

      expect(result).toEqual(mockTag);
      expect(tagsRepository.findById).toHaveBeenCalledWith("tag-123");
    });

    it("タグが存在しない場合NOT_FOUNDエラー", async () => {
      vi.mocked(tagsRepository.findById).mockResolvedValue(null);

      await expect(TagService.getTagById("tag-999")).rejects.toThrow(
        "タグが見つかりません"
      );
    });
  });

  describe("findTagByName", () => {
    it("名前でタグを検索できる", async () => {
      vi.mocked(tagsRepository.findByScopeAndName).mockResolvedValue(mockTag);

      const result = await TagService.findTagByName(mockUserId, "Important");

      expect(result).toEqual(mockTag);
      expect(tagsRepository.findByScopeAndName).toHaveBeenCalledWith(
        "USER",
        "Important",
        mockUserId
      );
    });

    it("タグが存在しない場合nullを返す", async () => {
      vi.mocked(tagsRepository.findByScopeAndName).mockResolvedValue(null);

      const result = await TagService.findTagByName(mockUserId, "NonExistent");

      expect(result).toBeNull();
    });
  });

  describe("createTag", () => {
    it("タグを作成できる", async () => {
      vi.mocked(tagsRepository.findByScopeAndName).mockResolvedValue(null);
      vi.mocked(tagsRepository.findByScopeAndColor).mockResolvedValue(null);
      vi.mocked(tagsRepository.create).mockResolvedValue(mockTag);

      const result = await TagService.createTag({
        ownerId: mockUserId,
        name: "Important",
        color: "#ff0000",
        description: "Important notes",
      });

      expect(result).toEqual(mockTag);
      expect(tagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: "USER",
          name: "Important",
          color: "#ff0000",
          owner: { connect: { id: mockUserId } },
        })
      );
    });

    it("同名タグが存在する場合ALREADY_EXISTSエラー", async () => {
      vi.mocked(tagsRepository.findByScopeAndName).mockResolvedValue(mockTag);

      await expect(
        TagService.createTag({
          ownerId: mockUserId,
          name: "Important",
          color: "#ff0000",
        })
      ).rejects.toThrow("同じ名前のタグが既に存在します");
    });
  });

  describe("updateTag", () => {
    it("タグを更新できる", async () => {
      const updatedTag = { ...mockTag, name: "Updated" };
      vi.mocked(tagsRepository.findById).mockResolvedValue(mockTag);
      vi.mocked(tagsRepository.findByScopeAndName).mockResolvedValue(null);
      vi.mocked(tagsRepository.findByScopeAndColor).mockResolvedValue(null);
      vi.mocked(tagsRepository.updateById).mockResolvedValue(updatedTag);

      const result = await TagService.updateTag("tag-123", {
        name: "Updated",
      });

      expect(result.name).toBe("Updated");
      expect(tagsRepository.updateById).toHaveBeenCalledWith(
        "tag-123",
        expect.objectContaining({ name: "Updated" })
      );
    });

    it("名前変更時に同名タグがあればALREADY_EXISTSエラー", async () => {
      const anotherTag = { ...mockTag, id: "tag-456", name: "Duplicate" };
      vi.mocked(tagsRepository.findById).mockResolvedValue(mockTag);
      vi.mocked(tagsRepository.findByScopeAndName).mockResolvedValue(anotherTag);

      await expect(
        TagService.updateTag("tag-123", { name: "Duplicate" })
      ).rejects.toThrow("同じ名前のタグが既に存在します");
    });

    it("タグが存在しない場合NOT_FOUNDエラー", async () => {
      vi.mocked(tagsRepository.findById).mockResolvedValue(null);

      await expect(
        TagService.updateTag("tag-999", { name: "Updated" })
      ).rejects.toThrow("タグが見つかりません");
    });
  });

  describe("deleteTag", () => {
    it("タグを削除できる", async () => {
      vi.mocked(tagsRepository.findById).mockResolvedValue(mockTag);
      vi.mocked(noteTagsRepository.deleteByTagId).mockResolvedValue({ count: 0 } as any);
      vi.mocked(tagsRepository.deleteById).mockResolvedValue(mockTag);

      await TagService.deleteTag("tag-123");

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(noteTagsRepository.deleteByTagId).toHaveBeenCalled();
      expect(tagsRepository.deleteById).toHaveBeenCalled();
    });

    it("システムタグは削除できない", async () => {
      const systemTag = { ...mockTag, scope: "SYSTEM" as const };
      vi.mocked(tagsRepository.findById).mockResolvedValue(systemTag);

      await expect(TagService.deleteTag("tag-123")).rejects.toThrow(
        "システムタグは削除できません"
      );
    });

    it("タグが存在しない場合NOT_FOUNDエラー", async () => {
      vi.mocked(tagsRepository.findById).mockResolvedValue(null);

      await expect(TagService.deleteTag("tag-999")).rejects.toThrow(
        "タグが見つかりません"
      );
    });
  });
});
