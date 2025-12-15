/**
 * Note API 結合テスト
 * API → Service → Repository の全レイヤーを通した統合テスト
 * 実際のデータベースを使用
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/notes/route";
import { GET as GETNote, PATCH, DELETE } from "@/app/api/notes/[id]/route";
import { getTestPrisma, cleanupDatabase } from "../../helpers/db";
import { TagScope } from "@prisma/client";

// 認証をモック化
vi.mock("@/server/auth/session", () => ({
  requireAuthUserId: vi.fn(),
  getSessionUserId: vi.fn(),
}));

const prisma = getTestPrisma();

// テスト用のID
let testUserId: string;
let otherUserId: string;
let testTagId: string;
let testProjectId: string;

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

describe("Note API 結合テスト", () => {
  beforeAll(async () => {
    await cleanupDatabase();

    // テストユーザーを作成
    const testUser = await prisma.user.create({
      data: { id: "test-api-note-user-v2" },
    });
    testUserId = testUser.id;

    const otherUser = await prisma.user.create({
      data: { id: "other-api-note-user-v2" },
    });
    otherUserId = otherUser.id;

    // テスト用タグを作成
    const tag = await prisma.tag.create({
      data: {
        name: "Test Tag",
        color: "#FF0000",
        scope: TagScope.USER,
        ownerId: testUserId,
      },
    });
    testTagId = tag.id;

    // テスト用プロジェクトを作成
    const project = await prisma.project.create({
      data: {
        name: "Test Project",
        ownerId: testUserId,
      },
    });
    testProjectId = project.id;

    // 認証モックの設定
    requireAuthUserId.mockResolvedValue(testUserId);
    getSessionUserId.mockResolvedValue(testUserId);
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  beforeEach(async () => {
    // テストごとにノートをクリーンアップ
    await prisma.task.deleteMany();
    await prisma.noteTag.deleteMany();
    await prisma.note.deleteMany();

    // 認証をリセット
    requireAuthUserId.mockResolvedValue(testUserId);
    getSessionUserId.mockResolvedValue(testUserId);
  });

  describe("POST /api/notes → NoteWriteService → notesRepository", () => {
    it("基本的なノートを作成できる", async () => {
      const request = createRequest("/api/notes", {
        method: "POST",
        body: {
          bodyMarkdown: "Test Note Content",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.bodyMarkdown).toBe("Test Note Content");
      expect(data.ownerId).toBe(testUserId);

      // DBに実際に保存されていることを確認
      const dbNote = await prisma.note.findUnique({
        where: { id: data.id },
      });
      expect(dbNote).not.toBeNull();
      expect(dbNote?.bodyMarkdown).toBe("Test Note Content");
    });

    it("タグ付きノートを作成できる", async () => {
      const request = createRequest("/api/notes", {
        method: "POST",
        body: {
          bodyMarkdown: "Tagged Note",
          tagIds: [testTagId],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.bodyMarkdown).toBe("Tagged Note");

      // DBでタグが関連付けられていることを確認
      const noteWithTags = await prisma.note.findUnique({
        where: { id: data.id },
        include: { tags: { include: { tag: true } } },
      });
      expect(noteWithTags?.tags.length).toBe(1);
      expect(noteWithTags?.tags[0].tag.id).toBe(testTagId);
    });

    it("タスク付きノートを作成できる", async () => {
      const request = createRequest("/api/notes", {
        method: "POST",
        body: {
          bodyMarkdown: "Task Note",
          task: {
            priority: 5,
          },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);

      // DBでタスクが作成されていることを確認
      const task = await prisma.task.findFirst({
        where: { noteId: data.id },
      });
      expect(task).not.toBeNull();
      expect(task?.priority).toBe(5);
    });

    it("プロジェクト関連付きノートを作成できる", async () => {
      const request = createRequest("/api/notes", {
        method: "POST",
        body: {
          bodyMarkdown: "Project Note",
          projectId: testProjectId,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.projectId).toBe(testProjectId);
    });
  });

  describe("GET /api/notes → NoteReadService → notesRepository", () => {
    beforeEach(async () => {
      // テストノートを作成
      await prisma.note.createMany({
        data: [
          { bodyMarkdown: "Note 1", ownerId: testUserId },
          { bodyMarkdown: "Note 2", ownerId: testUserId },
          { bodyMarkdown: "Archived Note", ownerId: testUserId, archivedAt: new Date() },
          { bodyMarkdown: "Deleted Note", ownerId: testUserId, deletedAt: new Date() },
          { bodyMarkdown: "Other User Note", ownerId: otherUserId },
        ],
      });
    });

    it("アクティブなノート一覧を取得できる", async () => {
      const request = createRequest("/api/notes?status=active");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.length).toBe(2);
      const contents = data.data.map((n: { bodyMarkdown: string }) => n.bodyMarkdown);
      expect(contents).toContain("Note 1");
      expect(contents).toContain("Note 2");
    });

    it("アーカイブ済みノート一覧を取得できる", async () => {
      const request = createRequest("/api/notes?status=archived");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(1);
      expect(data.data[0].bodyMarkdown).toBe("Archived Note");
    });

    it("削除済みノート一覧を取得できる", async () => {
      const request = createRequest("/api/notes?status=deleted");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(1);
      expect(data.data[0].bodyMarkdown).toBe("Deleted Note");
    });

    it("ページネーションが機能する", async () => {
      const request = createRequest("/api/notes?status=active&limit=1&page=1");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(1);
      expect(data.pagination.limit).toBe(1);
    });
  });

  describe("GET /api/notes/[id] → NoteReadService → notesRepository", () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await prisma.note.create({
        data: {
          bodyMarkdown: "Detail Note",
          ownerId: testUserId,
        },
      });
      noteId = note.id;
    });

    it("ノート詳細を取得できる", async () => {
      const request = createRequest(`/api/notes/${noteId}`);

      const response = await GETNote(request, { params: Promise.resolve({ id: noteId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(noteId);
      expect(data.bodyMarkdown).toBe("Detail Note");
    });

    it("存在しないノートは404エラー", async () => {
      const request = createRequest("/api/notes/non-existent-id");

      const response = await GETNote(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("他人のノートは403エラー", async () => {
      const otherNote = await prisma.note.create({
        data: {
          bodyMarkdown: "Other's Note",
          ownerId: otherUserId,
        },
      });

      const request = createRequest(`/api/notes/${otherNote.id}`);

      const response = await GETNote(request, { params: Promise.resolve({ id: otherNote.id }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("PERMISSION_DENIED");
    });
  });

  describe("PATCH /api/notes/[id] → NoteWriteService → notesRepository", () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await prisma.note.create({
        data: {
          title: "Original Title",
          bodyMarkdown: "Original Content",
          ownerId: testUserId,
        },
      });
      noteId = note.id;
    });

    it("ノートを更新できる", async () => {
      const request = createRequest(`/api/notes/${noteId}`, {
        method: "PATCH",
        body: {
          title: "Updated Title",
          bodyMarkdown: "Updated Content",
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: noteId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated Title");
      expect(data.bodyMarkdown).toBe("Updated Content");

      // DBも更新されていることを確認
      const dbNote = await prisma.note.findUnique({
        where: { id: noteId },
      });
      expect(dbNote?.title).toBe("Updated Title");
    });

    it("タグを更新できる", async () => {
      const request = createRequest(`/api/notes/${noteId}`, {
        method: "PATCH",
        body: {
          tagIds: [testTagId],
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: noteId }) });

      expect(response.status).toBe(200);

      // DBでタグが更新されていることを確認
      const noteWithTags = await prisma.note.findUnique({
        where: { id: noteId },
        include: { tags: true },
      });
      expect(noteWithTags?.tags.length).toBe(1);
      expect(noteWithTags?.tags[0].tagId).toBe(testTagId);
    });
  });

  describe("DELETE /api/notes/[id] → NoteDeleteService → notesRepository", () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await prisma.note.create({
        data: {
          bodyMarkdown: "To Delete",
          ownerId: testUserId,
        },
      });
      noteId = note.id;
    });

    it("ノートを論理削除できる", async () => {
      const request = createRequest(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: noteId }) });

      expect(response.status).toBe(204);

      // DBでdeletedAtが設定されていることを確認
      const dbNote = await prisma.note.findUnique({
        where: { id: noteId },
      });
      expect(dbNote).not.toBeNull();
      expect(dbNote?.deletedAt).not.toBeNull();
    });
  });
});
