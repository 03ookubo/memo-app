/**
 * Note Delete Service Unit Tests
 * Repositoryをモック化したユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Note, Prisma } from "@prisma/client";
import * as NoteDeleteService from "@/server/services/notes/note.delete.service";
import { notesRepository } from "@/server/repositories";

// Repositoryをモック化
vi.mock("@/server/repositories", () => ({
  notesRepository: {
    findById: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
    findMany: vi.fn(),
  },
  noteTagsRepository: {
    deleteByNoteId: vi.fn(),
  },
  attachmentsRepository: {
    deleteByNoteId: vi.fn(),
  },
  tasksRepository: {
    findByNoteId: vi.fn(),
    deleteByNoteId: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn((callback) => callback({})),
  },
}));

describe("NoteDeleteService", () => {
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

  describe("softDeleteNote", () => {
    it("ノートをソフト削除できる", async () => {
      const deletedNote = { ...mockNote, deletedAt: new Date() };
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);
      vi.mocked(notesRepository.updateById).mockResolvedValue(deletedNote);

      const result = await NoteDeleteService.softDeleteNote(
        "note-123",
        mockUserId
      );

      expect(result).toEqual(deletedNote);
      expect(notesRepository.updateById).toHaveBeenCalledWith("note-123", {
        deletedAt: expect.any(Date),
      });
    });

    it("既に削除済みの場合はCONFLICTエラー", async () => {
      const deletedNote = { ...mockNote, deletedAt: new Date() };
      vi.mocked(notesRepository.findById).mockResolvedValue(deletedNote);

      await expect(
        NoteDeleteService.softDeleteNote("note-123", mockUserId)
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "このノートは既に削除されています",
      });
    });
  });

  describe("restoreNote", () => {
    it("削除済みノートを復元できる", async () => {
      const deletedNote = { ...mockNote, deletedAt: new Date() };
      const restoredNote = { ...mockNote, deletedAt: null };
      vi.mocked(notesRepository.findById).mockResolvedValue(deletedNote);
      vi.mocked(notesRepository.updateById).mockResolvedValue(restoredNote);

      const result = await NoteDeleteService.restoreNote(
        "note-123",
        mockUserId
      );

      expect(result).toEqual(restoredNote);
      expect(notesRepository.updateById).toHaveBeenCalledWith("note-123", {
        deletedAt: null,
        archivedAt: null,
      });
    });

    it("削除されていない場合はCONFLICTエラー", async () => {
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);

      await expect(
        NoteDeleteService.restoreNote("note-123", mockUserId)
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "このノートは削除されていません",
      });
    });
  });

  describe("hardDeleteNote", () => {
    it("ノートを物理削除できる", async () => {
      const { noteTagsRepository, attachmentsRepository, tasksRepository } = await import("@/server/repositories");
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);
      vi.mocked(tasksRepository.findByNoteId).mockResolvedValue(null);
      vi.mocked(noteTagsRepository.deleteByNoteId).mockResolvedValue({ count: 0 } as Prisma.BatchPayload);
      vi.mocked(attachmentsRepository.deleteByNoteId).mockResolvedValue({ count: 0 } as Prisma.BatchPayload);
      vi.mocked(notesRepository.deleteById).mockResolvedValue(mockNote);

      await NoteDeleteService.hardDeleteNote("note-123", mockUserId);

      expect(noteTagsRepository.deleteByNoteId).toHaveBeenCalled();
      expect(attachmentsRepository.deleteByNoteId).toHaveBeenCalled();
      expect(notesRepository.deleteById).toHaveBeenCalled();
    });

    it("タスク付きノートも削除できる", async () => {
      const { noteTagsRepository, attachmentsRepository, tasksRepository } = await import("@/server/repositories");
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);
      vi.mocked(tasksRepository.findByNoteId).mockResolvedValue({
        id: "task-123",
        noteId: "note-123",
        dueAt: null,
        priority: null,
        completedAt: null,
        recurrenceRule: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(tasksRepository.deleteByNoteId).mockResolvedValue({
        id: "task-123",
        noteId: "note-123",
        dueAt: null,
        priority: null,
        completedAt: null,
        recurrenceRule: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(noteTagsRepository.deleteByNoteId).mockResolvedValue({ count: 1 } as Prisma.BatchPayload);
      vi.mocked(attachmentsRepository.deleteByNoteId).mockResolvedValue({ count: 0 } as Prisma.BatchPayload);
      vi.mocked(notesRepository.deleteById).mockResolvedValue(mockNote);

      await NoteDeleteService.hardDeleteNote("note-123", mockUserId);

      expect(tasksRepository.deleteByNoteId).toHaveBeenCalledWith("note-123", expect.anything());
      expect(notesRepository.deleteById).toHaveBeenCalled();
    });
  });
});
