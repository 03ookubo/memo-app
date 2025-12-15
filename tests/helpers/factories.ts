/**
 * テストデータFactory
 * テストで使用するダミーデータを生成
 */
import { TagScope, AttachmentKind } from "@prisma/client";

let counter = 0;
function getUniqueId() {
  return `test-${Date.now()}-${counter++}`;
}

/**
 * テスト用ユーザーデータ生成
 */
export function createUserData(overrides?: any) {
  const id = getUniqueId();
  return {
    name: `Test User ${id}`,
    email: `test-${id}@example.com`,
    settings: null,
    ...overrides,
  };
}

/**
 * テスト用プロジェクトデータ生成
 */
export function createProjectData(ownerId: string, overrides?: any) {
  const id = getUniqueId();
  return {
    ownerId,
    name: `Test Project ${id}`,
    description: "Test Description",
    emoji: "📁",
    sortIndex: 0,
    ...overrides,
  };
}

/**
 * テスト用ノートデータ生成
 */
export function createNoteData(ownerId: string, overrides?: any) {
  const id = getUniqueId();
  return {
    ownerId,
    title: `Test Note ${id}`,
    bodyMarkdown: "# Test Content",
    bodyHtml: "<h1>Test Content</h1>",
    sortIndex: 0,
    isEncrypted: false,
    ...overrides,
  };
}

/**
 * テスト用タグデータ生成（Prisma.TagCreateInput互換）
 * リポジトリテストで使用する場合は owner リレーションを使用
 */
export function createTagData(ownerId: string | null, scope: TagScope, overrides?: any) {
  const id = getUniqueId();
  const baseData = {
    scope,
    name: `Test Tag ${id}`,
    description: "Test tag description",
    color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    isPreset: false,
    ...overrides,
  };
  
  // ownerIdがある場合はPrismaのリレーション形式で返す
  if (ownerId) {
    return {
      ...baseData,
      owner: { connect: { id: ownerId } },
    };
  }
  
  return baseData;
}

/**
 * テスト用タスクデータ生成
 */
export function createTaskData(noteId: string, overrides?: any) {
  return {
    noteId,
    dueAt: new Date(Date.now() + 86400000), // 明日
    priority: 3,
    completedAt: null,
    recurrenceRule: null,
    metadata: null,
    ...overrides,
  };
}

/**
 * テスト用イベントデータ生成
 */
export function createEventData(noteId: string, overrides?: any) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  return {
    noteId,
    startAt: now,
    endAt: tomorrow,
    isAllDay: false,
    location: "Test Location",
    recurrenceRule: null,
    metadata: null,
    ...overrides,
  };
}

/**
 * テスト用添付ファイルデータ生成
 */
export function createAttachmentData(
  ownerId: string,
  noteId: string,
  position: number,
  overrides?: any
) {
  const id = getUniqueId();
  return {
    ownerId,
    noteId,
    position,
    url: `https://test-storage.example.com/test-${id}.jpg`,
    storagePath: `/test/${id}.jpg`,
    name: `test-${id}.jpg`,
    size: 1024,
    mimeType: "image/jpeg",
    kind: AttachmentKind.IMAGE,
    metadata: null,
    ...overrides,
  };
}

/**
 * テスト用統合データ生成
 */
export function createIntegrationData(userId: string, provider: string, overrides?: any) {
  return {
    userId,
    provider,
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresAt: new Date(Date.now() + 3600000), // 1時間後
    metadata: { test: true },
    ...overrides,
  };
}

/**
 * 完全なテストシナリオデータセット
 * ユーザー、プロジェクト、ノート、タスクを含む完全なデータ構造
 */
export interface TestDataSet {
  user: any;
  project: any;
  note: any;
  task?: any;
  event?: any;
  tags?: any[];
  attachments?: any[];
}
