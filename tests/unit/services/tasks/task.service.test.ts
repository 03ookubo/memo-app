/**
 * Task Service Unit Tests
 * Repositoryをモック化したユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Task } from "@prisma/client";
import * as TaskService from "@/server/services/tasks/task.service";
import { tasksRepository } from "@/server/repositories";

// Repositoryをモック化
vi.mock("@/server/repositories", () => ({
  tasksRepository: {
    findById: vi.fn(),
    findByNoteId: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    updateByNoteId: vi.fn(),
    deleteById: vi.fn(),
  },
}));

describe("TaskService", () => {
  const mockTask: Task = {
    id: "task-123",
    noteId: "note-123",
    dueAt: new Date("2025-12-31"),
    priority: 3,
    completedAt: null,
    recurrenceRule: null,
    metadata: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listTasks", () => {
    it("全タスクを取得できる", async () => {
      vi.mocked(tasksRepository.findMany).mockResolvedValue([mockTask]);
      vi.mocked(tasksRepository.count).mockResolvedValue(1);

      const result = await TaskService.listTasks({});

      expect(result.data).toEqual([mockTask]);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(tasksRepository.findMany).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ take: 20, skip: 0 })
      );
    });

    it("完了状態でフィルタできる", async () => {
      vi.mocked(tasksRepository.findMany).mockResolvedValue([]);
      vi.mocked(tasksRepository.count).mockResolvedValue(0);

      await TaskService.listTasks({ isCompleted: false });

      expect(tasksRepository.findMany).toHaveBeenCalledWith(
        { completedAt: null },
        expect.anything()
      );
    });
  });

  describe("listUncompletedTasks", () => {
    it("未完了タスクのみ取得できる", async () => {
      vi.mocked(tasksRepository.findMany).mockResolvedValue([mockTask]);
      vi.mocked(tasksRepository.count).mockResolvedValue(1);

      const result = await TaskService.listUncompletedTasks();

      expect(result.data).toEqual([mockTask]);
      expect(tasksRepository.findMany).toHaveBeenCalledWith(
        { completedAt: null },
        expect.anything()
      );
    });
  });

  describe("listCompletedTasks", () => {
    it("完了済みタスクのみ取得できる", async () => {
      const completedTask = { ...mockTask, completedAt: new Date() };
      vi.mocked(tasksRepository.findMany).mockResolvedValue([completedTask]);
      vi.mocked(tasksRepository.count).mockResolvedValue(1);

      const result = await TaskService.listCompletedTasks();

      expect(result.data).toEqual([completedTask]);
      expect(tasksRepository.findMany).toHaveBeenCalledWith(
        { completedAt: { not: null } },
        expect.anything()
      );
    });
  });

  describe("getTaskById", () => {
    it("タスクを取得できる", async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(mockTask);

      const result = await TaskService.getTaskById("task-123");

      expect(result).toEqual(mockTask);
      expect(tasksRepository.findById).toHaveBeenCalledWith("task-123");
    });

    it("タスクが存在しない場合NOT_FOUNDエラー", async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(null);

      await expect(TaskService.getTaskById("task-999")).rejects.toThrow(
        "タスクが見つかりません"
      );
    });
  });

  describe("getTaskByNoteId", () => {
    it("ノートIDでタスクを取得できる", async () => {
      vi.mocked(tasksRepository.findByNoteId).mockResolvedValue(mockTask);

      const result = await TaskService.getTaskByNoteId("note-123");

      expect(result).toEqual(mockTask);
      expect(tasksRepository.findByNoteId).toHaveBeenCalledWith("note-123");
    });

    it("タスクが存在しない場合nullを返す", async () => {
      vi.mocked(tasksRepository.findByNoteId).mockResolvedValue(null);

      const result = await TaskService.getTaskByNoteId("note-999");

      expect(result).toBeNull();
    });
  });

  describe("createTask", () => {
    it("タスクを作成できる", async () => {
      vi.mocked(tasksRepository.findByNoteId).mockResolvedValue(null);
      vi.mocked(tasksRepository.create).mockResolvedValue(mockTask);

      const result = await TaskService.createTask({
        noteId: "note-123",
        dueAt: new Date("2025-12-31"),
        priority: 3,
      });

      expect(result).toEqual(mockTask);
      expect(tasksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          note: { connect: { id: "note-123" } },
          dueAt: expect.any(Date),
          priority: 3,
        })
      );
    });

    it("既にタスクが存在する場合ALREADY_EXISTSエラー", async () => {
      vi.mocked(tasksRepository.findByNoteId).mockResolvedValue(mockTask);

      await expect(
        TaskService.createTask({
          noteId: "note-123",
          dueAt: new Date(),
          priority: 5,
        })
      ).rejects.toThrow("このノートには既にタスクが設定されています");
    });
  });

  describe("updateTask", () => {
    it("タスクを更新できる", async () => {
      const updatedTask = { ...mockTask, priority: 5 };
      vi.mocked(tasksRepository.findById).mockResolvedValue(mockTask);
      vi.mocked(tasksRepository.updateById).mockResolvedValue(updatedTask);

      const result = await TaskService.updateTask("task-123", { priority: 5 });

      expect(result.priority).toBe(5);
      expect(tasksRepository.updateById).toHaveBeenCalledWith(
        "task-123",
        expect.objectContaining({ priority: 5 })
      );
    });

    it("タスクが存在しない場合NOT_FOUNDエラー", async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(null);

      await expect(
        TaskService.updateTask("task-999", { priority: 5 })
      ).rejects.toThrow("タスクが見つかりません");
    });
  });

  describe("completeTask", () => {
    it("タスクを完了できる", async () => {
      const completedTask = { ...mockTask, completedAt: new Date() };
      vi.mocked(tasksRepository.findById).mockResolvedValue(mockTask);
      vi.mocked(tasksRepository.updateById).mockResolvedValue(completedTask);

      const result = await TaskService.completeTask("task-123");

      expect(result.completedAt).toBeTruthy();
      expect(tasksRepository.updateById).toHaveBeenCalledWith(
        "task-123",
        expect.objectContaining({ completedAt: expect.any(Date) })
      );
    });

    it("既に完了している場合CONFLICTエラー", async () => {
      const completedTask = { ...mockTask, completedAt: new Date() };
      vi.mocked(tasksRepository.findById).mockResolvedValue(completedTask);

      await expect(TaskService.completeTask("task-123")).rejects.toThrow(
        "このタスクは既に完了しています"
      );
    });
  });

  describe("uncompleteTask", () => {
    it("タスクを未完了に戻せる", async () => {
      const completedTask = { ...mockTask, completedAt: new Date() };
      vi.mocked(tasksRepository.findById).mockResolvedValue(completedTask);
      vi.mocked(tasksRepository.updateById).mockResolvedValue(mockTask);

      const result = await TaskService.uncompleteTask("task-123");

      expect(result.completedAt).toBeNull();
      expect(tasksRepository.updateById).toHaveBeenCalledWith(
        "task-123",
        { completedAt: null }
      );
    });

    it("既に未完了の場合CONFLICTエラー", async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(mockTask);

      await expect(TaskService.uncompleteTask("task-123")).rejects.toThrow(
        "このタスクは未完了です"
      );
    });
  });

  describe("deleteTask", () => {
    it("タスクを削除できる", async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(mockTask);
      vi.mocked(tasksRepository.deleteById).mockResolvedValue(mockTask);

      await TaskService.deleteTask("task-123");

      expect(tasksRepository.deleteById).toHaveBeenCalledWith("task-123");
    });

    it("タスクが存在しない場合NOT_FOUNDエラー", async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(null);

      await expect(TaskService.deleteTask("task-999")).rejects.toThrow(
        "タスクが見つかりません"
      );
    });
  });
});
