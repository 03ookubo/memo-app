/**
 * API テスト用セットアップ
 * Next.js App Router の API Route ハンドラをテストするためのヘルパー
 */

import { vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * NextRequest を作成するヘルパー
 */
export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
): NextRequest {
  const fullUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;

  const init: RequestInit = {
    method: options?.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  };

  if (options?.body) {
    init.body = JSON.stringify(options.body);
  }

  // Next.js の RequestInit は signal: null を許可しないため、undefined に変換
  const nextInit = {
    ...init,
    signal: init.signal === null ? undefined : init.signal,
  };

  return new NextRequest(fullUrl, nextInit as any);
}

/**
 * API レスポンスをパースするヘルパー
 */
export async function parseResponse<T = unknown>(
  response: Response
): Promise<{ status: number; data: T }> {
  const status = response.status;

  if (status === 204) {
    return { status, data: null as T };
  }

  const data = await response.json();
  return { status, data };
}

/**
 * 認証済みユーザーIDを返すモック
 */
export function mockAuthenticatedUser(userId: string) {
  vi.doMock("@/server/auth/session", () => ({
    requireAuthUserId: vi.fn().mockResolvedValue(userId),
    getAuthUserId: vi.fn().mockResolvedValue(userId),
  }));
}

/**
 * 認証エラーを返すモック
 */
export function mockUnauthenticated() {
  const { ServiceError } = require("@/server/services/types");
  vi.doMock("@/server/auth/session", () => ({
    requireAuthUserId: vi
      .fn()
      .mockRejectedValue(new ServiceError("認証が必要です", "UNAUTHORIZED")),
    getAuthUserId: vi.fn().mockResolvedValue(null),
  }));
}

/**
 * テスト用のモックデータ生成ヘルパー
 */
type MockNote = {
  id: string;
  ownerId: string;
  projectId: string | null;
  parentId: string | null;
  title: string;
  bodyMarkdown: string;
  bodyHtml: string | null;
  metadata: unknown;
  sortIndex: number;
  deletedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockProject = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  emoji: string | null;
  sortIndex: number;
  deletedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockTag = {
  id: string;
  ownerId: string;
  scope: "USER" | "SYSTEM";
  name: string;
  color: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockTask = {
  id: string;
  noteId: string;
  dueAt: Date | null;
  priority: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockAttachment = {
  id: string;
  ownerId: string;
  noteId: string;
  url: string;
  kind: "IMAGE" | "FILE";
  name: string;
  mimeType: string;
  size: number;
  metadata: unknown;
  sortIndex: number;
  createdAt: Date;
  updatedAt: Date;
};

export const mockData = {
  note: (overrides?: Partial<MockNote>): MockNote => ({
    id: "note-1",
    ownerId: "user-1",
    projectId: null,
    parentId: null,
    title: "Test Note",
    bodyMarkdown: "Test content",
    bodyHtml: null,
    metadata: null,
    sortIndex: 0,
    deletedAt: null,
    archivedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  }),

  project: (overrides?: Partial<MockProject>): MockProject => ({
    id: "project-1",
    ownerId: "user-1",
    name: "Test Project",
    description: null,
    emoji: null,
    sortIndex: 0,
    deletedAt: null,
    archivedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  }),

  tag: (overrides?: Partial<MockTag>): MockTag => ({
    id: "tag-1",
    ownerId: "user-1",
    scope: "USER" as const,
    name: "Test Tag",
    color: "#FF5733",
    description: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  }),

  task: (overrides?: Partial<MockTask>): MockTask => ({
    id: "task-1",
    noteId: "note-1",
    dueAt: null,
    priority: 0,
    completedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  }),

  attachment: (overrides?: Partial<MockAttachment>): MockAttachment => ({
    id: "attachment-1",
    ownerId: "user-1",
    noteId: "note-1",
    url: "https://example.com/image.png",
    kind: "IMAGE" as const,
    name: "image.png",
    mimeType: "image/png",
    size: 1024,
    sortIndex: 0,
    metadata: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  }),

  paginatedResult: <T>(data: T[], total?: number) => ({
    data,
    pagination: {
      page: 1,
      limit: 20,
      total: total ?? data.length,
      totalPages: Math.ceil((total ?? data.length) / 20),
      hasNext: false,
      hasPrev: false,
    },
  }),
};
