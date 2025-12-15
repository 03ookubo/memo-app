/**
 * Project Service Unit Tests
 * Repositoryをモック化したユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Project, Prisma } from "@prisma/client";
import * as ProjectService from "@/server/services/projects/project.service";
import { projectsRepository, notesRepository } from "@/server/repositories";
import prisma from "@/lib/prisma";

// Repositoryをモック化
vi.mock("@/server/repositories", () => ({
  projectsRepository: {
    findById: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findByOwnerIdAndName: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
  },
  notesRepository: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn((callback) => {
      const tx = {
        note: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      return callback(tx as any);
    }),
  },
}));

describe("ProjectService", () => {
  const mockUserId = "user-123";
  const mockProject: Project = {
    id: "project-123",
    ownerId: mockUserId,
    name: "My Project",
    description: "Project description",
    emoji: "📁",
    sortIndex: 0,
    archivedAt: null,
    deletedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listActiveProjects", () => {
    it("アクティブなプロジェクトを取得できる", async () => {
      vi.mocked(projectsRepository.findMany).mockResolvedValue([mockProject]);
      vi.mocked(projectsRepository.count).mockResolvedValue(1);

      const result = await ProjectService.listActiveProjects({
        ownerId: mockUserId,
      });

      expect(result.data).toEqual([mockProject]);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(projectsRepository.findMany).toHaveBeenCalledWith(
        { ownerId: mockUserId, deletedAt: null, archivedAt: null },
        expect.anything(),
        undefined
      );
    });
  });

  describe("listArchivedProjects", () => {
    it("アーカイブ済みプロジェクトを取得できる", async () => {
      const archivedProject = { ...mockProject, archivedAt: new Date() };
      vi.mocked(projectsRepository.findMany).mockResolvedValue([archivedProject]);
      vi.mocked(projectsRepository.count).mockResolvedValue(1);

      const result = await ProjectService.listArchivedProjects({
        ownerId: mockUserId,
      });

      expect(result.data).toEqual([archivedProject]);
      expect(projectsRepository.findMany).toHaveBeenCalledWith(
        { ownerId: mockUserId, deletedAt: null, archivedAt: { not: null } },
        expect.anything(),
        undefined
      );
    });
  });

  describe("listDeletedProjects", () => {
    it("削除済み（ゴミ箱）プロジェクトを取得できる", async () => {
      const deletedProject = { ...mockProject, deletedAt: new Date() };
      vi.mocked(projectsRepository.findMany).mockResolvedValue([deletedProject]);
      vi.mocked(projectsRepository.count).mockResolvedValue(1);

      const result = await ProjectService.listDeletedProjects({
        ownerId: mockUserId,
      });

      expect(result.data).toEqual([deletedProject]);
      expect(result.pagination.total).toBe(1);
      expect(projectsRepository.findMany).toHaveBeenCalledWith(
        { ownerId: mockUserId, deletedAt: { not: null } },
        expect.objectContaining({ sortBy: "updatedAt", sortOrder: "desc" }),
        undefined
      );
    });

    it("ゴミ箱が空の場合は空配列を返す", async () => {
      vi.mocked(projectsRepository.findMany).mockResolvedValue([]);
      vi.mocked(projectsRepository.count).mockResolvedValue(0);

      const result = await ProjectService.listDeletedProjects({
        ownerId: mockUserId,
      });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe("getProjectById", () => {
    it("プロジェクトを取得できる", async () => {
      vi.mocked(projectsRepository.findById).mockResolvedValue(mockProject);

      const result = await ProjectService.getProjectById("project-123", mockUserId);

      expect(result).toEqual(mockProject);
      expect(projectsRepository.findById).toHaveBeenCalledWith(
        "project-123",
        undefined
      );
    });

    it("プロジェクトが存在しない場合NOT_FOUNDエラー", async () => {
      vi.mocked(projectsRepository.findById).mockResolvedValue(null);

      await expect(
        ProjectService.getProjectById("project-999", mockUserId)
      ).rejects.toThrow("プロジェクトが見つかりません");
    });

    it("他人のプロジェクトにアクセスした場合PERMISSION_DENIEDエラー", async () => {
      vi.mocked(projectsRepository.findById).mockResolvedValue(mockProject);

      await expect(
        ProjectService.getProjectById("project-123", "other-user")
      ).rejects.toThrow("このプロジェクトにアクセスする権限がありません");
    });
  });

  describe("createProject", () => {
    it("プロジェクトを作成できる", async () => {
      vi.mocked(projectsRepository.findByOwnerIdAndName).mockResolvedValue(null);
      vi.mocked(projectsRepository.create).mockResolvedValue(mockProject);

      const result = await ProjectService.createProject({
        ownerId: mockUserId,
        name: "My Project",
        description: "Project description",
        emoji: "📁",
      });

      expect(result).toEqual(mockProject);
      expect(projectsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Project",
          description: "Project description",
          emoji: "📁",
          owner: { connect: { id: mockUserId } },
        })
      );
    });

    it("同名プロジェクトが存在する場合ALREADY_EXISTSエラー", async () => {
      vi.mocked(projectsRepository.findByOwnerIdAndName).mockResolvedValue(mockProject);

      await expect(
        ProjectService.createProject({
          ownerId: mockUserId,
          name: "My Project",
        })
      ).rejects.toThrow("同じ名前のプロジェクトが既に存在します");
    });
  });

  describe("updateProject", () => {
    it("プロジェクトを更新できる", async () => {
      const updatedProject = { ...mockProject, name: "Updated Project" };
      vi.mocked(projectsRepository.findById).mockResolvedValue(mockProject);
      vi.mocked(projectsRepository.findByOwnerIdAndName).mockResolvedValue(null);
      vi.mocked(projectsRepository.updateById).mockResolvedValue(updatedProject);

      const result = await ProjectService.updateProject(
        "project-123",
        mockUserId,
        { name: "Updated Project" }
      );

      expect(result.name).toBe("Updated Project");
      expect(projectsRepository.updateById).toHaveBeenCalledWith(
        "project-123",
        expect.objectContaining({ name: "Updated Project" })
      );
    });

    it("名前変更時に同名プロジェクトがあればALREADY_EXISTSエラー", async () => {
      const anotherProject = { ...mockProject, id: "project-456", name: "Duplicate" };
      vi.mocked(projectsRepository.findById).mockResolvedValue(mockProject);
      vi.mocked(projectsRepository.findByOwnerIdAndName).mockResolvedValue(anotherProject);

      await expect(
        ProjectService.updateProject("project-123", mockUserId, { name: "Duplicate" })
      ).rejects.toThrow("同じ名前のプロジェクトが既に存在します");
    });
  });

  describe("archiveProject", () => {
    it("プロジェクトをアーカイブできる", async () => {
      const archivedProject = { ...mockProject, archivedAt: new Date() };
      vi.mocked(projectsRepository.findById).mockResolvedValue(mockProject);
      vi.mocked(projectsRepository.updateById).mockResolvedValue(archivedProject);

      const result = await ProjectService.archiveProject("project-123", mockUserId);

      expect(result.archivedAt).toBeTruthy();
      expect(projectsRepository.updateById).toHaveBeenCalledWith(
        "project-123",
        expect.objectContaining({ archivedAt: expect.any(Date) })
      );
    });

    it("既にアーカイブされている場合CONFLICTエラー", async () => {
      const archivedProject = { ...mockProject, archivedAt: new Date() };
      vi.mocked(projectsRepository.findById).mockResolvedValue(archivedProject);

      await expect(
        ProjectService.archiveProject("project-123", mockUserId)
      ).rejects.toThrow("このプロジェクトは既にアーカイブされています");
    });
  });

  describe("unarchiveProject", () => {
    it("プロジェクトをアーカイブ解除できる", async () => {
      const archivedProject = { ...mockProject, archivedAt: new Date() };
      vi.mocked(projectsRepository.findById).mockResolvedValue(archivedProject);
      vi.mocked(projectsRepository.updateById).mockResolvedValue(mockProject);

      const result = await ProjectService.unarchiveProject("project-123", mockUserId);

      expect(result.archivedAt).toBeNull();
      expect(projectsRepository.updateById).toHaveBeenCalledWith(
        "project-123",
        { archivedAt: null }
      );
    });
  });

  describe("softDeleteProject", () => {
    it("プロジェクトを論理削除できる", async () => {
      const deletedProject = { ...mockProject, deletedAt: new Date() };
      vi.mocked(projectsRepository.findById).mockResolvedValue(mockProject);
      vi.mocked(projectsRepository.updateById).mockResolvedValue(deletedProject);

      const result = await ProjectService.softDeleteProject("project-123", mockUserId);

      expect(result.deletedAt).toBeTruthy();
      expect(projectsRepository.updateById).toHaveBeenCalledWith(
        "project-123",
        expect.objectContaining({ deletedAt: expect.any(Date) })
      );
    });

    it("既に削除されている場合CONFLICTエラー", async () => {
      const deletedProject = { ...mockProject, deletedAt: new Date() };
      vi.mocked(projectsRepository.findById).mockResolvedValue(deletedProject);

      await expect(
        ProjectService.softDeleteProject("project-123", mockUserId)
      ).rejects.toThrow("このプロジェクトは既に削除されています");
    });
  });

  describe("hardDeleteProject", () => {
    it("プロジェクトを物理削除できる", async () => {
      vi.mocked(projectsRepository.findById).mockResolvedValue(mockProject);
      vi.mocked(projectsRepository.deleteById).mockResolvedValue(mockProject);

      await ProjectService.hardDeleteProject("project-123", mockUserId);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(projectsRepository.deleteById).toHaveBeenCalled();
    });
  });
});
