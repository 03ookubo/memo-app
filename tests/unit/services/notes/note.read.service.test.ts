/**
 * Note Read Service Unit Tests
 * Repositoryをモック化したユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Note } from "@prisma/client";
import * as NoteReadService from "@/server/services/notes/note.read.service";
import { notesRepository } from "@/server/repositories";
import { ServiceError } from "@/server/services/types";

// Repositoryをモック化
vi.mock("@/server/repositories", () => ({
  notesRepository: {
    findById: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

describe("NoteReadService", () => {
  const mockUserId = "user-123";
  const mockNote: Note = {
    id: "note-123",
    ownerId: mockUserId,
    projectId: null,
    parentId: null,
    title: "Test Note",
    bodyMarkdown: "Test content",
    bodyHtml: "<p>Test content</p>",
    archivedAt: null,
    deletedAt: null,
    metadata: null,
    isEncrypted: false,
    sortIndex: 0,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listActiveNotes", () => {
    it("アクティブなノート一覧を取得できる", async () => {
      const mockNotes = [mockNote];
      vi.mocked(notesRepository.findMany).mockResolvedValue(mockNotes);
      vi.mocked(notesRepository.count).mockResolvedValue(1);

      const result = await NoteReadService.listActiveNotes({
        ownerId: mockUserId,
        pagination: { page: 1, limit: 20 },
      });

      expect(result.data).toEqual(mockNotes);
      expect(result.pagination.total).toBe(1);
      expect(notesRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: mockUserId,
          deletedAt: null,
          archivedAt: null,
        }),
        expect.any(Object),
        undefined
      );
    });

    it("タグIDでフィルタできる", async () => {
      vi.mocked(notesRepository.findMany).mockResolvedValue([mockNote]);
      vi.mocked(notesRepository.count).mockResolvedValue(1);

      await NoteReadService.listActiveNotes({
        ownerId: mockUserId,
        tagId: "tag-123",
      });

      expect(notesRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: { some: { tagId: "tag-123" } },
        }),
        expect.any(Object),
        undefined
      );
    });

    it("プロジェクトIDでフィルタできる", async () => {
      vi.mocked(notesRepository.findMany).mockResolvedValue([mockNote]);
      vi.mocked(notesRepository.count).mockResolvedValue(1);

      await NoteReadService.listActiveNotes({
        ownerId: mockUserId,
        projectId: "project-123",
      });

      expect(notesRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "project-123",
        }),
        expect.any(Object),
        undefined
      );
    });

    it("検索文字列でフィルタできる", async () => {
      vi.mocked(notesRepository.findMany).mockResolvedValue([mockNote]);
      vi.mocked(notesRepository.count).mockResolvedValue(1);

      await NoteReadService.listActiveNotes({
        ownerId: mockUserId,
        search: "test",
      });

      expect(notesRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          OR: expect.arrayContaining([
            { title: { contains: "test", mode: "insensitive" } },
            { bodyMarkdown: { contains: "test", mode: "insensitive" } },
          ]),
        }),
        expect.any(Object),
        undefined
      );
    });

    it("ページネーションが正しく動作する", async () => {
      vi.mocked(notesRepository.findMany).mockResolvedValue([mockNote]);
      vi.mocked(notesRepository.count).mockResolvedValue(100);

      const result = await NoteReadService.listActiveNotes({
        ownerId: mockUserId,
        pagination: { page: 3, limit: 10 },
      });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(10);
      expect(notesRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ skip: 20, take: 10 }),
        undefined
      );
    });
  });

  describe("listArchivedNotes", () => {
    it("アーカイブ済みノート一覧を取得できる", async () => {
      const archivedNote = { ...mockNote, archivedAt: new Date() };
      vi.mocked(notesRepository.findMany).mockResolvedValue([archivedNote]);
      vi.mocked(notesRepository.count).mockResolvedValue(1);

      const result = await NoteReadService.listArchivedNotes({
        ownerId: mockUserId,
      });

      expect(result.data).toEqual([archivedNote]);
      expect(notesRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: mockUserId,
          deletedAt: null,
          archivedAt: { not: null },
        }),
        expect.any(Object),
        undefined
      );
    });
  });

  describe("listDeletedNotes", () => {
    it("削除済みノート一覧を取得できる", async () => {
      const deletedNote = { ...mockNote, deletedAt: new Date() };
      vi.mocked(notesRepository.findMany).mockResolvedValue([deletedNote]);
      vi.mocked(notesRepository.count).mockResolvedValue(1);

      const result = await NoteReadService.listDeletedNotes({
        ownerId: mockUserId,
      });

      expect(result.data).toEqual([deletedNote]);
      expect(notesRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: mockUserId,
          deletedAt: { not: null },
        }),
        expect.any(Object),
        undefined
      );
    });
  });

  describe("getNoteById", () => {
    it("IDでノートを取得できる", async () => {
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);

      const result = await NoteReadService.getNoteById(
        "note-123",
        mockUserId
      );

      expect(result).toEqual(mockNote);
      expect(notesRepository.findById).toHaveBeenCalledWith(
        "note-123",
        undefined
      );
    });

    it("存在しないノートはNOT_FOUNDエラー", async () => {
      vi.mocked(notesRepository.findById).mockResolvedValue(null);

      await expect(
        NoteReadService.getNoteById("note-999", mockUserId)
      ).rejects.toThrow(ServiceError);

      await expect(
        NoteReadService.getNoteById("note-999", mockUserId)
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "ノートが見つかりません",
      });
    });

    it("他人のノートはPERMISSION_DENIEDエラー", async () => {
      vi.mocked(notesRepository.findById).mockResolvedValue({
        ...mockNote,
        ownerId: "other-user",
      });

      await expect(
        NoteReadService.getNoteById("note-123", mockUserId)
      ).rejects.toThrow(ServiceError);

      await expect(
        NoteReadService.getNoteById("note-123", mockUserId)
      ).rejects.toMatchObject({
        code: "PERMISSION_DENIED",
        message: "このノートにアクセスする権限がありません",
      });
    });

    it("includeオプションを渡せる", async () => {
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);

      await NoteReadService.getNoteById("note-123", mockUserId, {
        task: true,
        tags: true,
      });

      expect(notesRepository.findById).toHaveBeenCalledWith("note-123", {
        task: true,
        tags: true,
      });
    });
  });

  describe("listChildNotes", () => {
    it("子ノート一覧を取得できる", async () => {
      const childNote = { ...mockNote, id: "child-1", parentId: "note-123" };
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);
      vi.mocked(notesRepository.findMany).mockResolvedValue([childNote]);

      const result = await NoteReadService.listChildNotes(
        "note-123",
        mockUserId
      );

      expect(result).toEqual([childNote]);
      expect(notesRepository.findById).toHaveBeenCalledWith("note-123", undefined);
      expect(notesRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: "note-123",
          ownerId: mockUserId,
          deletedAt: null,
        }),
        expect.any(Object),
        undefined
      );
    });

    it("存在しない親ノートはNOT_FOUNDエラー", async () => {
      vi.mocked(notesRepository.findById).mockResolvedValue(null);

      await expect(
        NoteReadService.listChildNotes("note-999", mockUserId)
      ).rejects.toThrow(ServiceError);
    });
  });
});
