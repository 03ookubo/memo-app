/**
 * Attachment API 結合テスト
 * API → Service → Repository の全レイヤーを通した統合テスト
 * 実際のデータベースを使用
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/attachments/route";
import { GET as GETAttachment, PATCH, DELETE } from "@/app/api/attachments/[id]/route";
import { getTestPrisma, cleanupDatabase } from "../../helpers/db";
import { AttachmentKind } from "@prisma/client";

// 認証をモック化
vi.mock("@/server/auth/session", () => ({
  requireAuthUserId: vi.fn(),
  getSessionUserId: vi.fn(),
}));

const prisma = getTestPrisma();

// テスト用のユーザーID
let testUserId: string;
let testNoteId: string;

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

describe("Attachment API 結合テスト", () => {
  beforeAll(async () => {
    await cleanupDatabase();

    // テストユーザーを作成
    const testUser = await prisma.user.create({
      data: { id: "test-api-attachment-user" },
    });
    testUserId = testUser.id;

    // テスト用ノートを作成
    const note = await prisma.note.create({
      data: {
        ownerId: testUserId,
        bodyMarkdown: "Test Note for Attachments",
      },
    });
    testNoteId = note.id;

    // 認証モックの設定
    requireAuthUserId.mockResolvedValue(testUserId);
    getSessionUserId.mockResolvedValue(testUserId);
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  beforeEach(async () => {
    // テストごとに添付ファイルをクリーンアップ
    await prisma.attachment.deleteMany();

    // 認証をリセット
    requireAuthUserId.mockResolvedValue(testUserId);
    getSessionUserId.mockResolvedValue(testUserId);
  });

  describe("POST /api/attachments → AttachmentService → attachmentsRepository", () => {
    it("URLから添付ファイルを作成できる", async () => {
      const request = createRequest("/api/attachments", {
        method: "POST",
        body: {
          noteId: testNoteId,
          url: "https://example.com/image.png",
          kind: "IMAGE",
          name: "Test Image",
          mimeType: "image/png",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.noteId).toBe(testNoteId);
      expect(data.url).toBe("https://example.com/image.png");
      expect(data.kind).toBe(AttachmentKind.IMAGE);
      expect(data.name).toBe("Test Image");

      // DBに実際に保存されていることを確認
      const dbAttachment = await prisma.attachment.findUnique({
        where: { id: data.id },
      });
      expect(dbAttachment).not.toBeNull();
      expect(dbAttachment?.url).toBe("https://example.com/image.png");
    });

    it("リンク添付を作成できる", async () => {
      const request = createRequest("/api/attachments", {
        method: "POST",
        body: {
          noteId: testNoteId,
          url: "https://example.com/page",
          kind: "LINK",
          name: "External Link",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.kind).toBe(AttachmentKind.LINK);
    });

    it("レイアウト情報付きで作成できる", async () => {
      const request = createRequest("/api/attachments", {
        method: "POST",
        body: {
          noteId: testNoteId,
          url: "https://example.com/image.jpg",
          kind: "IMAGE",
          layout: {
            width: "50%",
            align: "center",
            caption: "キャプション",
          },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata?.layout?.width).toBe("50%");
      expect(data.metadata?.layout?.align).toBe("center");
      expect(data.metadata?.layout?.caption).toBe("キャプション");
    });

    it("不正なURLはバリデーションエラー", async () => {
      const request = createRequest("/api/attachments", {
        method: "POST",
        body: {
          noteId: testNoteId,
          url: "invalid-url",
          kind: "IMAGE",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("GET /api/attachments → AttachmentService → attachmentsRepository", () => {
    beforeEach(async () => {
      // テスト用添付ファイルを作成
      await prisma.attachment.createMany({
        data: [
          {
            noteId: testNoteId,
            ownerId: testUserId,
            url: "https://example.com/image1.png",
            kind: AttachmentKind.IMAGE,
            name: "Image 1",
            position: 0,
          },
          {
            noteId: testNoteId,
            ownerId: testUserId,
            url: "https://example.com/image2.png",
            kind: AttachmentKind.IMAGE,
            name: "Image 2",
            position: 1,
          },
          {
            noteId: testNoteId,
            ownerId: testUserId,
            url: "https://example.com/doc.pdf",
            kind: AttachmentKind.FILE,
            name: "Document",
            position: 2,
          },
        ],
      });
    });

    it("ノートの添付ファイル一覧を取得できる", async () => {
      const request = createRequest(`/api/attachments?noteId=${testNoteId}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.length).toBe(3);
    });

    it("ページネーションが機能する", async () => {
      const request = createRequest(`/api/attachments?noteId=${testNoteId}&limit=2&page=1`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(2);
      expect(data.pagination.limit).toBe(2);
    });

    it("noteIdが必須", async () => {
      const request = createRequest("/api/attachments");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("GET /api/attachments/[id] → AttachmentService → attachmentsRepository", () => {
    let attachmentId: string;

    beforeEach(async () => {
      const attachment = await prisma.attachment.create({
        data: {
          noteId: testNoteId,
          ownerId: testUserId,
          url: "https://example.com/detail.png",
          kind: AttachmentKind.IMAGE,
          name: "Detail Image",
          position: 0,
        },
      });
      attachmentId = attachment.id;
    });

    it("添付ファイル詳細を取得できる", async () => {
      const request = createRequest(`/api/attachments/${attachmentId}`);

      const response = await GETAttachment(request, { params: Promise.resolve({ id: attachmentId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(attachmentId);
      expect(data.name).toBe("Detail Image");
    });

    it("存在しない添付ファイルは404エラー", async () => {
      const request = createRequest("/api/attachments/non-existent-id");

      const response = await GETAttachment(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe("PATCH /api/attachments/[id] → AttachmentService → attachmentsRepository", () => {
    let attachmentId: string;

    beforeEach(async () => {
      const attachment = await prisma.attachment.create({
        data: {
          noteId: testNoteId,
          ownerId: testUserId,
          url: "https://example.com/update.png",
          kind: AttachmentKind.IMAGE,
          name: "Original Name",
          position: 0,
        },
      });
      attachmentId = attachment.id;
    });

    it("添付ファイル名を更新できる", async () => {
      const request = createRequest(`/api/attachments/${attachmentId}`, {
        method: "PATCH",
        body: {
          name: "Updated Name",
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: attachmentId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Name");

      // DBも更新されていることを確認
      const dbAttachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
      });
      expect(dbAttachment?.name).toBe("Updated Name");
    });

    it("レイアウトを更新できる", async () => {
      const request = createRequest(`/api/attachments/${attachmentId}`, {
        method: "PATCH",
        body: {
          layout: {
            width: "100%",
            align: "left",
          },
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: attachmentId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata?.layout?.width).toBe("100%");
      expect(data.metadata?.layout?.align).toBe("left");
    });

    it("存在しない添付ファイルは404エラー", async () => {
      const request = createRequest("/api/attachments/non-existent-id", {
        method: "PATCH",
        body: { name: "Updated" },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe("DELETE /api/attachments/[id] → AttachmentService → attachmentsRepository", () => {
    let attachmentId: string;

    beforeEach(async () => {
      const attachment = await prisma.attachment.create({
        data: {
          noteId: testNoteId,
          ownerId: testUserId,
          url: "https://example.com/delete.png",
          kind: AttachmentKind.IMAGE,
          name: "To Delete",
          position: 0,
        },
      });
      attachmentId = attachment.id;
    });

    it("添付ファイルを削除できる", async () => {
      const request = createRequest(`/api/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: attachmentId }) });

      expect(response.status).toBe(204);

      // DBから削除されていることを確認
      const dbAttachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
      });
      expect(dbAttachment).toBeNull();
    });

    it("存在しない添付ファイルは404エラー", async () => {
      const request = createRequest("/api/attachments/non-existent-id", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });
});
