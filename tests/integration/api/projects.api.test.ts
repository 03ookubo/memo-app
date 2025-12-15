/**
 * Project API 結合テスト
 * API → Service → Repository の全レイヤーを通した統合テスト
 * 実際のデータベースを使用
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/projects/route";
import { GET as GETProject, PATCH, DELETE } from "@/app/api/projects/[id]/route";
import { getTestPrisma, cleanupDatabase } from "../../helpers/db";

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

describe("Project API 結合テスト", () => {
  beforeAll(async () => {
    await cleanupDatabase();

    // テストユーザーを作成
    const testUser = await prisma.user.create({
      data: { id: "test-api-project-user-v2" },
    });
    testUserId = testUser.id;

    const otherUser = await prisma.user.create({
      data: { id: "other-api-project-user-v2" },
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
    // テストごとにプロジェクトをクリーンアップ
    await prisma.note.deleteMany();
    await prisma.project.deleteMany();

    // 認証をリセット
    requireAuthUserId.mockResolvedValue(testUserId);
    getSessionUserId.mockResolvedValue(testUserId);
  });

  describe("POST /api/projects → ProjectService → projectsRepository", () => {
    it("基本的なプロジェクトを作成できる", async () => {
      const request = createRequest("/api/projects", {
        method: "POST",
        body: {
          name: "Test Project",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("Test Project");
      expect(data.ownerId).toBe(testUserId);
      expect(data.archivedAt).toBeNull();

      // DBに実際に保存されていることを確認
      const dbProject = await prisma.project.findUnique({
        where: { id: data.id },
      });
      expect(dbProject).not.toBeNull();
      expect(dbProject?.name).toBe("Test Project");
    });

    it("説明と絵文字付きプロジェクトを作成できる", async () => {
      const request = createRequest("/api/projects", {
        method: "POST",
        body: {
          name: "Full Project",
          description: "プロジェクトの説明",
          emoji: "🚀",
          sortIndex: 10,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("Full Project");
      expect(data.description).toBe("プロジェクトの説明");
      expect(data.emoji).toBe("🚀");
      expect(data.sortIndex).toBe(10);
    });

    it("名前が空のプロジェクトはバリデーションエラー", async () => {
      const request = createRequest("/api/projects", {
        method: "POST",
        body: {
          name: "",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("GET /api/projects → ProjectService → projectsRepository", () => {
    beforeEach(async () => {
      // テスト用プロジェクトを作成
      await prisma.project.createMany({
        data: [
          { name: "Project 1", ownerId: testUserId },
          { name: "Project 2", ownerId: testUserId },
          { name: "Archived Project", ownerId: testUserId, archivedAt: new Date() },
          { name: "Other User Project", ownerId: otherUserId },
        ],
      });
    });

    it("アクティブなプロジェクト一覧を取得できる", async () => {
      const request = createRequest("/api/projects");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      const projectNames = data.data.map((p: { name: string }) => p.name);
      expect(projectNames).toContain("Project 1");
      expect(projectNames).toContain("Project 2");
      expect(projectNames).not.toContain("Archived Project");
      expect(projectNames).not.toContain("Other User Project");
    });

    it("アーカイブ済みプロジェクト一覧を取得できる", async () => {
      const request = createRequest("/api/projects?status=archived");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const projectNames = data.data.map((p: { name: string }) => p.name);
      expect(projectNames).toContain("Archived Project");
      expect(projectNames).not.toContain("Project 1");
    });

    it("ページネーションが機能する", async () => {
      const request = createRequest("/api/projects?limit=1&page=1");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(1);
      expect(data.pagination.limit).toBe(1);
    });
  });

  describe("GET /api/projects/[id] → ProjectService → projectsRepository", () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: "Detail Project",
          description: "詳細取得用プロジェクト",
          emoji: "📁",
          ownerId: testUserId,
        },
      });
      projectId = project.id;
    });

    it("プロジェクト詳細を取得できる", async () => {
      const request = createRequest(`/api/projects/${projectId}`);

      const response = await GETProject(request, { params: Promise.resolve({ id: projectId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(projectId);
      expect(data.name).toBe("Detail Project");
      expect(data.description).toBe("詳細取得用プロジェクト");
      expect(data.emoji).toBe("📁");
    });

    it("存在しないプロジェクトは404エラー", async () => {
      const request = createRequest("/api/projects/non-existent-id");

      const response = await GETProject(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it("他人のプロジェクトは403エラー", async () => {
      const otherProject = await prisma.project.create({
        data: {
          name: "Other Project",
          ownerId: otherUserId,
        },
      });

      const request = createRequest(`/api/projects/${otherProject.id}`);

      const response = await GETProject(request, { params: Promise.resolve({ id: otherProject.id }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });
  });

  describe("PATCH /api/projects/[id] → ProjectService → projectsRepository", () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: "Update Project",
          ownerId: testUserId,
        },
      });
      projectId = project.id;
    });

    it("プロジェクトを更新できる", async () => {
      const request = createRequest(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: {
          name: "Updated Project Name",
          description: "新しい説明",
          emoji: "✨",
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: projectId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Project Name");
      expect(data.description).toBe("新しい説明");
      expect(data.emoji).toBe("✨");

      // DBも更新されていることを確認
      const dbProject = await prisma.project.findUnique({
        where: { id: projectId },
      });
      expect(dbProject?.name).toBe("Updated Project Name");
    });

    it("sortIndexを更新できる", async () => {
      const request = createRequest(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: {
          sortIndex: 99,
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: projectId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sortIndex).toBe(99);
    });

    it("他人のプロジェクトは更新できない", async () => {
      const otherProject = await prisma.project.create({
        data: {
          name: "Other Project",
          ownerId: otherUserId,
        },
      });

      const request = createRequest(`/api/projects/${otherProject.id}`, {
        method: "PATCH",
        body: {
          name: "Hacked Name",
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: otherProject.id }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });
  });

  describe("DELETE /api/projects/[id] → ProjectService → projectsRepository", () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: "Delete Project",
          ownerId: testUserId,
        },
      });
      projectId = project.id;
    });

    it("プロジェクトをソフトデリートできる", async () => {
      const request = createRequest(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: projectId }) });

      expect(response.status).toBe(204);

      // DBでdeletedAtが設定されていることを確認
      const dbProject = await prisma.project.findUnique({
        where: { id: projectId },
      });
      expect(dbProject).not.toBeNull();
      expect(dbProject?.deletedAt).not.toBeNull();
    });

    it("プロジェクトを完全削除できる", async () => {
      const request = createRequest(`/api/projects/${projectId}?permanent=true`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: projectId }) });

      expect(response.status).toBe(204);

      // DBから完全に削除されていることを確認
      const dbProject = await prisma.project.findUnique({
        where: { id: projectId },
      });
      expect(dbProject).toBeNull();
    });

    it("他人のプロジェクトは削除できない", async () => {
      const otherProject = await prisma.project.create({
        data: {
          name: "Other Delete Project",
          ownerId: otherUserId,
        },
      });

      const request = createRequest(`/api/projects/${otherProject.id}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: otherProject.id }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();

      // DBに残っていることを確認
      const dbProject = await prisma.project.findUnique({
        where: { id: otherProject.id },
      });
      expect(dbProject).not.toBeNull();
    });

    it("存在しないプロジェクトは404エラー", async () => {
      const request = createRequest("/api/projects/non-existent-id", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });
});
