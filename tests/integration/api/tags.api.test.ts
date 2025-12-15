/**
 * Tag API 結合テスト
 * API → Service → Repository の全レイヤーを通した統合テスト
 * 実際のデータベースを使用
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/tags/route";
import { GET as GETTag, PATCH, DELETE } from "@/app/api/tags/[id]/route";
import { getTestPrisma, cleanupDatabase } from "../../helpers/db";
import { TagScope } from "@prisma/client";

// 認証をモック化
vi.mock("@/server/auth/session", () => ({
  requireAuthUserId: vi.fn(),
  getSessionUserId: vi.fn(),
}));

const prisma = getTestPrisma();

// テスト用のユーザーID
let testUserId: string;
let otherUserId: string;

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

describe("Tag API 結合テスト", () => {
  beforeAll(async () => {
    await cleanupDatabase();

    // テストユーザーを作成
    const testUser = await prisma.user.create({
      data: { id: "test-api-tag-user-v2" },
    });
    testUserId = testUser.id;

    const otherUser = await prisma.user.create({
      data: { id: "other-api-tag-user-v2" },
    });
    otherUserId = otherUser.id;

    // 認証モックの設定
    requireAuthUserId.mockResolvedValue(testUserId);
    getSessionUserId.mockResolvedValue(testUserId);
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  beforeEach(async () => {
    // テストごとにタグをクリーンアップ
    await prisma.noteTag.deleteMany();
    await prisma.tag.deleteMany();

    // 認証をリセット
    requireAuthUserId.mockResolvedValue(testUserId);
    getSessionUserId.mockResolvedValue(testUserId);
  });

  describe("POST /api/tags → TagService → tagsRepository", () => {
    it("ユーザータグを作成できる", async () => {
      const request = createRequest("/api/tags", {
        method: "POST",
        body: {
          name: "Test Tag",
          color: "#FF0000",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("Test Tag");
      expect(data.color).toBe("#FF0000");
      expect(data.scope).toBe(TagScope.USER);
      expect(data.ownerId).toBe(testUserId);

      // DBに実際に保存されていることを確認
      const dbTag = await prisma.tag.findUnique({
        where: { id: data.id },
      });
      expect(dbTag).not.toBeNull();
      expect(dbTag?.name).toBe("Test Tag");
    });

    it("説明付きタグを作成できる", async () => {
      const request = createRequest("/api/tags", {
        method: "POST",
        body: {
          name: "Important",
          color: "#00FF00",
          description: "重要なノートに付けるタグ",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("Important");
      expect(data.description).toBe("重要なノートに付けるタグ");
    });

    it("名前が空のタグはバリデーションエラー", async () => {
      const request = createRequest("/api/tags", {
        method: "POST",
        body: {
          name: "",
          color: "#FF0000",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("GET /api/tags → TagService → tagsRepository", () => {
    beforeEach(async () => {
      // テスト用タグを作成
      await prisma.tag.createMany({
        data: [
          { name: "Tag 1", color: "#FF0000", scope: TagScope.USER, ownerId: testUserId },
          { name: "Tag 2", color: "#00FF00", scope: TagScope.USER, ownerId: testUserId },
          { name: "Tag 3", color: "#0000FF", scope: TagScope.USER, ownerId: testUserId },
          { name: "System Tag", color: "#FFFF00", scope: TagScope.SYSTEM },
          { name: "Other User Tag", color: "#FF00FF", scope: TagScope.USER, ownerId: otherUserId },
        ],
      });
    });

    it("全タグを取得できる（デフォルト）", async () => {
      const request = createRequest("/api/tags");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      // デフォルトでは自分のタグが取得できる
      const tagNames = data.data.map((t: { name: string }) => t.name);
      expect(tagNames).toContain("Tag 1");
      expect(tagNames).toContain("Tag 2");
      expect(tagNames).toContain("Tag 3");
      // デフォルトではシステムタグは含まれない・他人のタグも含まれない
      expect(tagNames).not.toContain("Other User Tag");
    });

    it("ユーザータグのみを取得できる", async () => {
      const request = createRequest("/api/tags?scope=user");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const tagNames = data.data.map((t: { name: string }) => t.name);
      expect(tagNames).toContain("Tag 1");
      expect(tagNames).not.toContain("System Tag");
      expect(tagNames).not.toContain("Other User Tag");
    });

    it("システムタグのみを取得できる", async () => {
      const request = createRequest("/api/tags?scope=system");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const tagNames = data.data.map((t: { name: string }) => t.name);
      expect(tagNames).toContain("System Tag");
      expect(tagNames).not.toContain("Tag 1");
    });

    it("ページネーションが機能する", async () => {
      const request = createRequest("/api/tags?scope=user&limit=2&page=1");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(2);
      expect(data.pagination.limit).toBe(2);
    });
  });

  describe("GET /api/tags/[id] → TagService → tagsRepository", () => {
    let tagId: string;

    beforeEach(async () => {
      const tag = await prisma.tag.create({
        data: {
          name: "Detail Tag",
          color: "#123456",
          description: "タグ詳細テスト",
          scope: TagScope.USER,
          ownerId: testUserId,
        },
      });
      tagId = tag.id;
    });

    it("タグ詳細を取得できる", async () => {
      const request = createRequest(`/api/tags/${tagId}`);

      const response = await GETTag(request, { params: Promise.resolve({ id: tagId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(tagId);
      expect(data.name).toBe("Detail Tag");
      expect(data.color).toBe("#123456");
      expect(data.description).toBe("タグ詳細テスト");
    });

    it("存在しないタグは404エラー", async () => {
      const request = createRequest("/api/tags/non-existent-id");

      const response = await GETTag(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe("PATCH /api/tags/[id] → TagService → tagsRepository", () => {
    let tagId: string;

    beforeEach(async () => {
      const tag = await prisma.tag.create({
        data: {
          name: "Update Tag",
          color: "#AAAAAA",
          scope: TagScope.USER,
          ownerId: testUserId,
        },
      });
      tagId = tag.id;
    });

    it("タグを更新できる", async () => {
      const request = createRequest(`/api/tags/${tagId}`, {
        method: "PATCH",
        body: {
          name: "Updated Tag Name",
          color: "#BBBBBB",
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: tagId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Tag Name");
      expect(data.color).toBe("#BBBBBB");

      // DBも更新されていることを確認
      const dbTag = await prisma.tag.findUnique({
        where: { id: tagId },
      });
      expect(dbTag?.name).toBe("Updated Tag Name");
    });

    it("説明を追加できる", async () => {
      const request = createRequest(`/api/tags/${tagId}`, {
        method: "PATCH",
        body: {
          description: "新しい説明",
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: tagId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.description).toBe("新しい説明");
    });

    it("システムタグは更新できない", async () => {
      const systemTag = await prisma.tag.create({
        data: {
          name: "System Tag",
          color: "#000000",
          scope: TagScope.SYSTEM,
        },
      });

      const request = createRequest(`/api/tags/${systemTag.id}`, {
        method: "PATCH",
        body: {
          name: "Hacked Name",
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: systemTag.id }) });
      const data = await response.json();

      // システムタグの更新は禁止されるべき
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });
  });

  describe("DELETE /api/tags/[id] → TagService → tagsRepository", () => {
    let tagId: string;

    beforeEach(async () => {
      const tag = await prisma.tag.create({
        data: {
          name: "Delete Tag",
          color: "#CCCCCC",
          scope: TagScope.USER,
          ownerId: testUserId,
        },
      });
      tagId = tag.id;
    });

    it("タグを削除できる", async () => {
      const request = createRequest(`/api/tags/${tagId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: tagId }) });

      expect(response.status).toBe(204);

      // DBから削除されていることを確認
      const dbTag = await prisma.tag.findUnique({
        where: { id: tagId },
      });
      expect(dbTag).toBeNull();
    });

    it("システムタグは削除できない", async () => {
      const systemTag = await prisma.tag.create({
        data: {
          name: "System Delete Tag",
          color: "#DDDDDD",
          scope: TagScope.SYSTEM,
        },
      });

      const request = createRequest(`/api/tags/${systemTag.id}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: systemTag.id }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();

      // DBに残っていることを確認
      const dbTag = await prisma.tag.findUnique({
        where: { id: systemTag.id },
      });
      expect(dbTag).not.toBeNull();
    });

    it("存在しないタグは404エラー", async () => {
      const request = createRequest("/api/tags/non-existent-id", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });
});
