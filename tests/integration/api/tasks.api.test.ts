/**
 * Task API 結合テスト
 * API → Service → Repository の全レイヤーを通した統合テスト
 * 実際のデータベースを使用
 *
 * タスクはノートに紐づいて作成されるため、
 * ノート作成時にタスク付きで作成し、その後タスクを操作します
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/tasks/route";
import { GET as GETTask, PATCH, DELETE } from "@/app/api/tasks/[id]/route";
import { POST as POSTNote } from "@/app/api/notes/route";
import { getTestPrisma, cleanupDatabase } from "../../helpers/db";

// 認証をモック化
vi.mock("@/server/auth/session", () => ({
  requireAuthUserId: vi.fn(),
  getSessionUserId: vi.fn(),
}));

const prisma = getTestPrisma();

// テスト用のユーザーID
let testUserId: string;

// モック関数を型安全に取得
const { requireAuthUserId, getSessionUserId } = vi.mocked(
  await import("@/server/auth/session")
);

/**
 * モックリクエストを作成
 */
function createRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
  }
): NextRequest {
  const baseUrl = "http://localhost:3000";
  const fullUrl = url.startsWith("/") ? `${baseUrl}${url}` : url;

  if (options?.body) {
    return new NextRequest(fullUrl, {
      method: options?.method ?? "GET",
      body: JSON.stringify(options.body),
      headers: { "Content-Type": "application/json" },
    });
  }

  return new NextRequest(fullUrl, {
    method: options?.method ?? "GET",
  });
}

describe("Task API 結合テスト", () => {
  beforeAll(async () => {
    await cleanupDatabase();

    // テストユーザーを作成
    const testUser = await prisma.user.create({
      data: { id: "test-api-task-user-v2" },
    });
    testUserId = testUser.id;

    // 認証モックの設定
    requireAuthUserId.mockResolvedValue(testUserId);
    getSessionUserId.mockResolvedValue(testUserId);
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  beforeEach(async () => {
    // テストごとにタスクとノートをクリーンアップ
    await prisma.task.deleteMany();
    await prisma.note.deleteMany();

    // 認証をリセット
    requireAuthUserId.mockResolvedValue(testUserId);
    getSessionUserId.mockResolvedValue(testUserId);
  });

  /**
   * ヘルパー: タスク付きノートを作成
   */
  async function createNoteWithTask(options?: {
    dueAt?: string;
    priority?: number;
  }): Promise<{ noteId: string; taskId: string }> {
    const request = createRequest("/api/notes", {
      method: "POST",
      body: {
        bodyMarkdown: "Task Test Note",
        task: {
          ...(options?.dueAt && { dueAt: options.dueAt }),
          ...(options?.priority !== undefined && { priority: options.priority }),
        },
      },
    });

    const response = await POSTNote(request);
    const data = await response.json();

    // DBからタスクIDを取得
    const task = await prisma.task.findFirst({
      where: { noteId: data.id },
    });

    return { noteId: data.id, taskId: task!.id };
  }

  describe("GET /api/tasks → TaskService → tasksRepository", () => {
    beforeEach(async () => {
      // テスト用タスク付きノートを作成
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // 未完了タスク
      await createNoteWithTask({ dueAt: tomorrow.toISOString(), priority: 1 });
      await createNoteWithTask({ dueAt: yesterday.toISOString(), priority: 2 });

      // 完了タスク
      const { taskId } = await createNoteWithTask();
      await prisma.task.update({
        where: { id: taskId },
        data: { completedAt: new Date() },
      });
    });

    it("全タスク一覧を取得できる", async () => {
      const request = createRequest("/api/tasks");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.length).toBe(3);
    });

    it("未完了タスクのみを取得できる", async () => {
      const request = createRequest("/api/tasks?status=uncompleted");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(2);
      data.data.forEach((task: { completedAt: Date | null }) => {
        expect(task.completedAt).toBeNull();
      });
    });

    it("完了タスクのみを取得できる", async () => {
      const request = createRequest("/api/tasks?status=completed");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(1);
      data.data.forEach((task: { completedAt: Date | null }) => {
        expect(task.completedAt).not.toBeNull();
      });
    });

    it("ページネーションが機能する", async () => {
      const request = createRequest("/api/tasks?limit=2&page=1");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(2);
      expect(data.pagination.limit).toBe(2);
    });
  });

  describe("GET /api/tasks/[id] → TaskService → tasksRepository", () => {
    let taskId: string;

    beforeEach(async () => {
      const result = await createNoteWithTask({ priority: 5 });
      taskId = result.taskId;
    });

    it("タスク詳細を取得できる", async () => {
      const request = createRequest(`/api/tasks/${taskId}`);

      const response = await GETTask(request, { params: Promise.resolve({ id: taskId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(taskId);
      expect(data.priority).toBe(5);
    });

    it("存在しないタスクは404エラー", async () => {
      const request = createRequest("/api/tasks/non-existent-id");

      const response = await GETTask(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe("PATCH /api/tasks/[id] → TaskService → tasksRepository", () => {
    let taskId: string;

    beforeEach(async () => {
      const result = await createNoteWithTask({ priority: 1 });
      taskId = result.taskId;
    });

    it("タスクの優先度を更新できる", async () => {
      const request = createRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: {
          priority: 5,
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: taskId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.priority).toBe(5);

      // DBも更新されていることを確認
      const dbTask = await prisma.task.findUnique({
        where: { id: taskId },
      });
      expect(dbTask?.priority).toBe(5);
    });

    it("タスクの期限を設定できる", async () => {
      const dueAt = new Date("2025-12-31T23:59:59.000Z");
      const request = createRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: {
          dueAt: dueAt.toISOString(),
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: taskId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(new Date(data.dueAt).toISOString()).toBe(dueAt.toISOString());
    });

    it("タスクの期限を削除できる", async () => {
      // まず期限を設定
      await prisma.task.update({
        where: { id: taskId },
        data: { dueAt: new Date() },
      });

      const request = createRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: {
          dueAt: null,
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: taskId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dueAt).toBeNull();
    });

    it("存在しないタスクは404エラー", async () => {
      const request = createRequest("/api/tasks/non-existent-id", {
        method: "PATCH",
        body: {
          priority: 5,
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe("DELETE /api/tasks/[id] → TaskService → tasksRepository", () => {
    let taskId: string;

    beforeEach(async () => {
      const result = await createNoteWithTask();
      taskId = result.taskId;
    });

    it("タスクを削除できる", async () => {
      const request = createRequest(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: taskId }) });

      expect(response.status).toBe(204);

      // DBから削除されていることを確認
      const dbTask = await prisma.task.findUnique({
        where: { id: taskId },
      });
      expect(dbTask).toBeNull();
    });

    it("存在しないタスクは404エラー", async () => {
      const request = createRequest("/api/tasks/non-existent-id", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe("タスクとノートの連携テスト", () => {
    it("ノート作成時にタスクが作成される", async () => {
      const { noteId, taskId } = await createNoteWithTask({
        dueAt: "2025-12-31T23:59:59.000Z",
        priority: 3,
      });

      // タスクがノートに紐づいていることを確認
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      expect(task).not.toBeNull();
      expect(task?.noteId).toBe(noteId);
      expect(task?.priority).toBe(3);
      expect(task?.dueAt?.toISOString()).toBe("2025-12-31T23:59:59.000Z");
    });

    it("タスク削除後もノートは残る", async () => {
      const { noteId, taskId } = await createNoteWithTask();

      // タスクを削除
      const request = createRequest(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      await DELETE(request, { params: Promise.resolve({ id: taskId }) });

      // ノートは残っている
      const note = await prisma.note.findUnique({
        where: { id: noteId },
      });
      expect(note).not.toBeNull();

      // タスクは削除されている
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });
      expect(task).toBeNull();
    });
  });
});
