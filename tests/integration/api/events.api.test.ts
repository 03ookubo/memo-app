/**
 * Event API 結合テスト
 * API → Service → Repository の全レイヤーを通した統合テスト
 * 実際のデータベースを使用
 * 
 * イベントはノートに紐づいて作成される（Note:Event = 1:1）
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/events/route";
import { GET as GETEvent, PATCH, DELETE } from "@/app/api/events/[id]/route";
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

/**
 * ヘルパー: イベント付きノートを作成
 */
async function createNoteWithEvent(
  ownerId: string,
  eventData?: {
    startAt?: Date;
    endAt?: Date;
    isAllDay?: boolean;
    location?: string;
  }
): Promise<{ noteId: string; eventId: string }> {
  const startAt = eventData?.startAt ?? new Date();
  const endAt = eventData?.endAt ?? new Date(startAt.getTime() + 60 * 60 * 1000); // 1時間後

  const note = await prisma.note.create({
    data: {
      ownerId,
      bodyMarkdown: "Event Note",
      event: {
        create: {
          startAt,
          endAt,
          isAllDay: eventData?.isAllDay ?? false,
          location: eventData?.location,
        },
      },
    },
    include: { event: true },
  });

  return { noteId: note.id, eventId: note.event!.id };
}

describe("Event API 結合テスト", () => {
  beforeAll(async () => {
    await cleanupDatabase();

    // テストユーザーを作成
    const testUser = await prisma.user.create({
      data: { id: "test-api-event-user" },
    });
    testUserId = testUser.id;

    const otherUser = await prisma.user.create({
      data: { id: "other-api-event-user" },
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
    // テストごとにイベントとノートをクリーンアップ
    await prisma.event.deleteMany();
    await prisma.note.deleteMany();

    // 認証をリセット
    requireAuthUserId.mockResolvedValue(testUserId);
    getSessionUserId.mockResolvedValue(testUserId);
  });

  describe("GET /api/events → EventService → eventsRepository", () => {
    beforeEach(async () => {
      // テスト用イベントを作成
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 今日から1週間以内のイベント
      await createNoteWithEvent(testUserId, {
        startAt: tomorrow,
        endAt: new Date(tomorrow.getTime() + 60 * 60 * 1000),
      });

      // 来週のイベント
      await createNoteWithEvent(testUserId, {
        startAt: nextWeek,
        endAt: new Date(nextWeek.getTime() + 60 * 60 * 1000),
      });

      // 先週のイベント（過去）
      await createNoteWithEvent(testUserId, {
        startAt: lastWeek,
        endAt: new Date(lastWeek.getTime() + 60 * 60 * 1000),
      });

      // 他人のイベント
      await createNoteWithEvent(otherUserId, {
        startAt: tomorrow,
        endAt: new Date(tomorrow.getTime() + 60 * 60 * 1000),
      });
    });

    it("イベント一覧を取得できる", async () => {
      const request = createRequest("/api/events");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      // 自分のイベント3件のみ取得
      expect(data.data.length).toBe(3);
    });

    it("期間を指定してイベントを取得できる", async () => {
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();

      const request = createRequest(`/api/events?startDate=${startDate}&endDate=${endDate}`);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 先週のイベントは含まれない
      expect(data.data.length).toBe(2);
    });

    it("他人のイベントは取得されない", async () => {
      const request = createRequest("/api/events");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 他人のイベントは含まれない
      data.data.forEach((event: { note?: { ownerId: string } }) => {
        expect(event.note?.ownerId).toBe(testUserId);
      });
    });
  });

  describe("GET /api/events/[id] → EventService → eventsRepository", () => {
    let eventId: string;

    beforeEach(async () => {
      const result = await createNoteWithEvent(testUserId, {
        location: "東京オフィス",
        isAllDay: false,
      });
      eventId = result.eventId;
    });

    it("イベント詳細を取得できる", async () => {
      const request = createRequest(`/api/events/${eventId}`);

      const response = await GETEvent(request, { params: Promise.resolve({ id: eventId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(eventId);
      expect(data.location).toBe("東京オフィス");
      expect(data.isAllDay).toBe(false);
      // ノート情報も含まれる
      expect(data.note).toBeDefined();
    });

    it("存在しないイベントは404エラー", async () => {
      const request = createRequest("/api/events/non-existent-id");

      const response = await GETEvent(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it("他人のイベントは404エラー", async () => {
      const otherResult = await createNoteWithEvent(otherUserId);

      const request = createRequest(`/api/events/${otherResult.eventId}`);

      const response = await GETEvent(request, { params: Promise.resolve({ id: otherResult.eventId }) });
      const data = await response.json();

      // セキュリティ上、他人のイベントは「存在しない」として扱う
      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe("PATCH /api/events/[id] → EventService → eventsRepository", () => {
    let eventId: string;

    beforeEach(async () => {
      const result = await createNoteWithEvent(testUserId, {
        location: "旧オフィス",
        isAllDay: false,
      });
      eventId = result.eventId;
    });

    it("イベントの場所を更新できる", async () => {
      const request = createRequest(`/api/events/${eventId}`, {
        method: "PATCH",
        body: {
          location: "新オフィス",
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: eventId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.location).toBe("新オフィス");

      // DBも更新されていることを確認
      const dbEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(dbEvent?.location).toBe("新オフィス");
    });

    it("終日イベントに変更できる", async () => {
      const request = createRequest(`/api/events/${eventId}`, {
        method: "PATCH",
        body: {
          isAllDay: true,
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: eventId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isAllDay).toBe(true);
    });

    it("日時を更新できる", async () => {
      const newStartAt = new Date("2025-12-25T10:00:00.000Z");
      const newEndAt = new Date("2025-12-25T12:00:00.000Z");

      const request = createRequest(`/api/events/${eventId}`, {
        method: "PATCH",
        body: {
          startAt: newStartAt.toISOString(),
          endAt: newEndAt.toISOString(),
        },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: eventId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(new Date(data.startAt).toISOString()).toBe(newStartAt.toISOString());
      expect(new Date(data.endAt).toISOString()).toBe(newEndAt.toISOString());
    });

    it("存在しないイベントは404エラー", async () => {
      const request = createRequest("/api/events/non-existent-id", {
        method: "PATCH",
        body: { location: "どこか" },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it("他人のイベントは更新できない", async () => {
      const otherResult = await createNoteWithEvent(otherUserId);

      const request = createRequest(`/api/events/${otherResult.eventId}`, {
        method: "PATCH",
        body: { location: "変更" },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: otherResult.eventId }) });
      const data = await response.json();

      // セキュリティ上、他人のイベントは「存在しない」として扱う
      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe("DELETE /api/events/[id] → EventService → eventsRepository", () => {
    let eventId: string;
    let noteId: string;

    beforeEach(async () => {
      const result = await createNoteWithEvent(testUserId);
      eventId = result.eventId;
      noteId = result.noteId;
    });

    it("イベントを削除できる", async () => {
      const request = createRequest(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: eventId }) });

      expect(response.status).toBe(204);

      // DBから削除されていることを確認
      const dbEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(dbEvent).toBeNull();

      // ノートは残っていることを確認
      const dbNote = await prisma.note.findUnique({
        where: { id: noteId },
      });
      expect(dbNote).not.toBeNull();
    });

    it("存在しないイベントは404エラー", async () => {
      const request = createRequest("/api/events/non-existent-id", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "non-existent-id" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it("他人のイベントは削除できない", async () => {
      const otherResult = await createNoteWithEvent(otherUserId);

      const request = createRequest(`/api/events/${otherResult.eventId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: otherResult.eventId }) });
      const data = await response.json();

      // セキュリティ上、他人のイベントは「存在しない」として扱う
      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();

      // DBには残っていることを確認
      const dbEvent = await prisma.event.findUnique({
        where: { id: otherResult.eventId },
      });
      expect(dbEvent).not.toBeNull();
    });
  });
});
