/**
 * Note Archive Service Unit Tests
 * Repositoryをモック化したユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Note } from "@prisma/client";
import * as NoteArchiveService from "@/server/services/notes/note.archive.service";
import { notesRepository } from "@/server/repositories";

// Repositoryをモック化
vi.mock("@/server/repositories", () => ({
  notesRepository: {
    findById: vi.fn(),
    updateById: vi.fn(),
  },
}));

describe("NoteArchiveService", () => {
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

  describe("archiveNote", () => {
    it("ノートをアーカイブできる", async () => {
      const archivedNote = { ...mockNote, archivedAt: new Date() };
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);
      vi.mocked(notesRepository.updateById).mockResolvedValue(archivedNote);

      const result = await NoteArchiveService.archiveNote(
        "note-123",
        mockUserId
      );

      expect(result).toEqual(archivedNote);
      expect(notesRepository.updateById).toHaveBeenCalledWith("note-123", {
        archivedAt: expect.any(Date),
      });
    });

    it("既にアーカイブ済みの場合はCONFLICTエラー", async () => {
      const archivedNote = { ...mockNote, archivedAt: new Date() };
      vi.mocked(notesRepository.findById).mockResolvedValue(archivedNote);

      await expect(
        NoteArchiveService.archiveNote("note-123", mockUserId)
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "このノートは既にアーカイブされています",
      });
    });

    it("削除済みノートはアーカイブできない", async () => {
      const deletedNote = { ...mockNote, deletedAt: new Date() };
      vi.mocked(notesRepository.findById).mockResolvedValue(deletedNote);

      await expect(
        NoteArchiveService.archiveNote("note-123", mockUserId)
      ).rejects.toMatchObject({
        code: "CONFLICT",
      });
    });
  });

  describe("unarchiveNote", () => {
    it("ノートのアーカイブを解除できる", async () => {
      const archivedNote = { ...mockNote, archivedAt: new Date() };
      const unarchivedNote = { ...mockNote, archivedAt: null };
      vi.mocked(notesRepository.findById).mockResolvedValue(archivedNote);
      vi.mocked(notesRepository.updateById).mockResolvedValue(unarchivedNote);

      const result = await NoteArchiveService.unarchiveNote(
        "note-123",
        mockUserId
      );

      expect(result).toEqual(unarchivedNote);
      expect(notesRepository.updateById).toHaveBeenCalledWith("note-123", {
        archivedAt: null,
      });
    });

    it("アーカイブされていない場合はCONFLICTエラー", async () => {
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);

      await expect(
        NoteArchiveService.unarchiveNote("note-123", mockUserId)
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "このノートはアーカイブされていません",
      });
    });
  });
});
