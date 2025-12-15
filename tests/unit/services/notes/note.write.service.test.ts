/**
 * Note Write Service Unit Tests
 * Repositoryをモック化したユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Note, Prisma } from "@prisma/client";
import * as NoteWriteService from "@/server/services/notes/note.write.service";
import {
  notesRepository,
  noteTagsRepository,
  tasksRepository,
  eventsRepository,
} from "@/server/repositories";
import prisma from "@/lib/prisma";

// Repositoryをモック化
vi.mock("@/server/repositories", () => ({
  notesRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
  },
  noteTagsRepository: {
    createMany: vi.fn(),
    deleteByNoteId: vi.fn(),
  },
  tasksRepository: {
    create: vi.fn(),
    findByNoteId: vi.fn(),
    updateById: vi.fn(),
    updateByNoteId: vi.fn(),
    deleteByNoteId: vi.fn(),
  },
  eventsRepository: {
    create: vi.fn(),
    findByNoteId: vi.fn(),
    updateById: vi.fn(),
    deleteByNoteId: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("NoteWriteService", () => {
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

  describe("createNote", () => {
    it("基本的なノートを作成できる", async () => {
      vi.mocked(notesRepository.create).mockResolvedValue(mockNote);

      const result = await NoteWriteService.createNote({
        ownerId: mockUserId,
        title: "Test Note",
        bodyMarkdown: "Test content",
      });

      expect(result).toEqual(mockNote);
      expect(notesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Note",
          bodyMarkdown: "Test content",
          owner: { connect: { id: mockUserId } },
        })
      );
    });

    it("タグ付きノートを作成できる（トランザクション）", async () => {
      vi.mocked(notesRepository.create).mockResolvedValue(mockNote);
      vi.mocked(noteTagsRepository.createMany).mockResolvedValue({ count: 2 } as Prisma.BatchPayload);
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);

      const result = await NoteWriteService.createNote({
        ownerId: mockUserId,
        title: "Test Note",
        tagIds: ["tag-1", "tag-2"],
      });

      expect(result).toEqual(mockNote);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(noteTagsRepository.createMany).toHaveBeenCalledWith(
        "note-123",
        ["tag-1", "tag-2"],
        expect.anything()
      );
    });

    it("タスク付きノートを作成できる（トランザクション）", async () => {
      vi.mocked(notesRepository.create).mockResolvedValue(mockNote);
      vi.mocked(tasksRepository.create).mockResolvedValue({
        id: "task-123",
        noteId: "note-123",
        dueAt: new Date("2025-12-31"),
        priority: 3,
        completedAt: null,
        recurrenceRule: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);

      const result = await NoteWriteService.createNote({
        ownerId: mockUserId,
        title: "Task Note",
        task: {
          dueAt: new Date("2025-12-31"),
          priority: 3,
        },
      });

      expect(result).toEqual(mockNote);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tasksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { connect: { id: "note-123" } },
          dueAt: expect.any(Date),
          priority: 3,
        }),
        expect.anything()
      );
    });

    it("イベント付きノートを作成できる（トランザクション）", async () => {
      const startAt = new Date("2025-12-31T10:00:00");
      const endAt = new Date("2025-12-31T11:00:00");

      vi.mocked(notesRepository.create).mockResolvedValue(mockNote);
      vi.mocked(eventsRepository.create).mockResolvedValue({
        id: "event-123",
        noteId: "note-123",
        startAt,
        endAt,
        isAllDay: false,
        location: null,
        recurrenceRule: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);

      const result = await NoteWriteService.createNote({
        ownerId: mockUserId,
        title: "Event Note",
        event: {
          startAt,
          endAt,
        },
      });

      expect(result).toEqual(mockNote);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { connect: { id: "note-123" } },
          startAt,
          endAt,
        }),
        expect.anything()
      );
    });
  });

  describe("updateNote", () => {
    it("基本的なノート情報を更新できる", async () => {
      const updatedNote = { ...mockNote, title: "Updated Title" };
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);
      vi.mocked(notesRepository.updateById).mockResolvedValue(updatedNote);

      const result = await NoteWriteService.updateNote("note-123", mockUserId, {
        title: "Updated Title",
      });

      expect(result.title).toBe("Updated Title");
      expect(notesRepository.updateById).toHaveBeenCalledWith(
        "note-123",
        expect.objectContaining({ title: "Updated Title" })
      );
    });

    it("タグを同期できる（トランザクション）", async () => {
      vi.mocked(notesRepository.findById)
        .mockResolvedValueOnce(mockNote)
        .mockResolvedValueOnce(mockNote);
      vi.mocked(noteTagsRepository.deleteByNoteId).mockResolvedValue({ count: 2 } as Prisma.BatchPayload);
      vi.mocked(noteTagsRepository.createMany).mockResolvedValue({ count: 2 } as Prisma.BatchPayload);

      await NoteWriteService.updateNote("note-123", mockUserId, {
        tagIds: ["tag-1", "tag-2"],
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(noteTagsRepository.deleteByNoteId).toHaveBeenCalledWith(
        "note-123",
        expect.anything()
      );
      expect(noteTagsRepository.createMany).toHaveBeenCalledWith(
        "note-123",
        ["tag-1", "tag-2"],
        expect.anything()
      );
    });

    it("タスク情報を更新できる（トランザクション）", async () => {
      const noteWithTask = {
        ...mockNote,
        task: {
          id: "task-123",
          noteId: "note-123",
          dueAt: null,
          priority: null,
          completedAt: null,
          recurrenceRule: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any;
      vi.mocked(notesRepository.findById)
        .mockResolvedValueOnce(noteWithTask)
        .mockResolvedValueOnce(mockNote);
      vi.mocked(notesRepository.updateById).mockResolvedValue(undefined as any);
      vi.mocked(tasksRepository.updateByNoteId).mockResolvedValue({
        id: "task-123",
        noteId: "note-123",
        dueAt: new Date("2025-12-31"),
        priority: 5,
        completedAt: null,
        recurrenceRule: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await NoteWriteService.updateNote("note-123", mockUserId, {
        task: {
          dueAt: new Date("2025-12-31"),
          priority: 5,
        },
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tasksRepository.updateByNoteId).toHaveBeenCalledWith(
        "note-123",
        expect.objectContaining({
          dueAt: expect.any(Date),
          priority: 5,
        }),
        expect.anything()
      );
    });

    it("タスクを削除できる（nullを渡す）", async () => {
      const noteWithTask = {
        ...mockNote,
        task: {
          id: "task-123",
          noteId: "note-123",
          dueAt: null,
          priority: null,
          completedAt: null,
          recurrenceRule: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any;
      vi.mocked(notesRepository.findById)
        .mockResolvedValueOnce(noteWithTask)
        .mockResolvedValueOnce(mockNote);
      vi.mocked(notesRepository.updateById).mockResolvedValue(undefined as any);
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
      });

      await NoteWriteService.updateNote("note-123", mockUserId, {
        task: null,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tasksRepository.deleteByNoteId).toHaveBeenCalledWith(
        "note-123",
        expect.anything()
      );
    });
  });

  describe("addTaskToNote", () => {
    it("ノートにタスクを追加できる", async () => {
      vi.mocked(notesRepository.findById)
        .mockResolvedValueOnce({ ...mockNote, ownerId: mockUserId })
        .mockResolvedValueOnce(mockNote);
      vi.mocked(tasksRepository.create).mockResolvedValue({
        id: "task-123",
        noteId: "note-123",
        dueAt: new Date("2025-12-31"),
        priority: 3,
        completedAt: null,
        recurrenceRule: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await NoteWriteService.addTaskToNote(
        "note-123",
        mockUserId,
        {
          dueAt: new Date("2025-12-31"),
          priority: 3,
        }
      );

      expect(result).toEqual(mockNote);
      expect(tasksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { connect: { id: "note-123" } },
          dueAt: expect.any(Date),
          priority: 3,
        })
      );
    });

    it("既にタスクが存在する場合はALREADY_EXISTSエラー", async () => {
      vi.mocked(notesRepository.findById).mockResolvedValue({
        ...mockNote,
        ownerId: mockUserId,
        task: {
          id: "task-123",
          noteId: "note-123",
          dueAt: null,
          priority: null,
          completedAt: null,
          recurrenceRule: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      await expect(
        NoteWriteService.addTaskToNote(
          "note-123",
          mockUserId,
          {
            dueAt: new Date(),
            priority: 5,
          }
        )
      ).rejects.toThrow("このノートには既にタスクが設定されています");
    });
  });

  describe("removeTaskFromNote", () => {
    it("ノートからタスクを削除できる", async () => {
      vi.mocked(notesRepository.findById).mockResolvedValue({
        ...mockNote,
        task: {
          id: "task-123",
          noteId: "note-123",
          dueAt: null,
          priority: null,
          completedAt: null,
          recurrenceRule: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);
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
      });

      await NoteWriteService.removeTaskFromNote("note-123", mockUserId);

      expect(tasksRepository.deleteByNoteId).toHaveBeenCalledWith("note-123");
    });
  });

  describe("updateNoteSortIndex", () => {
    it("ノートのソート順を更新できる", async () => {
      const updatedNote = { ...mockNote, sortIndex: 5 };
      vi.mocked(notesRepository.findById).mockResolvedValue(mockNote);
      vi.mocked(notesRepository.updateById).mockResolvedValue(updatedNote);

      const result = await NoteWriteService.updateNoteSortIndex(
        "note-123",
        mockUserId,
        5
      );

      expect(result.sortIndex).toBe(5);
      expect(notesRepository.updateById).toHaveBeenCalledWith(
        "note-123",
        { sortIndex: 5 }
      );
    });
  });
});
