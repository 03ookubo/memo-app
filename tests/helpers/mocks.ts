/**
 * モックヘルパー
 * Unit Testで使用するモックオブジェクト生成
 */
import { vi } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma Clientのモックを生成
 */
export function createMockPrismaClient() {
  return {
    $transaction: vi.fn((callback: any) => callback({})),
    user: createMockModel(),
    note: createMockModel(),
    project: createMockModel(),
    tag: createMockModel(),
    task: createMockModel(),
    event: createMockModel(),
    attachment: createMockModel(),
    noteTag: createMockModel(),
    integration: createMockModel(),
    credential: createMockModel(),
    linkCode: createMockModel(),
  } as unknown as PrismaClient;
}

/**
 * Prismaモデルのモック生成
 */
function createMockModel() {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

/**
 * Repository層のモック生成
 */
export function createMockRepository<T extends Record<string, any>>(
  methods: (keyof T)[]
): T {
  const mock = {} as any;
  for (const method of methods) {
    mock[method] = vi.fn();
  }
  return mock;
}

/**
 * Service層で使用するRepositoryモックセット
 */
export function createRepositoryMocks() {
  return {
    notesRepository: createMockRepository([
      "findById",
      "findMany",
      "create",
      "updateById",
      "deleteById",
      "count",
    ]),
    projectsRepository: createMockRepository([
      "findById",
      "findMany",
      "create",
      "updateById",
      "deleteById",
      "count",
    ]),
    tagsRepository: createMockRepository([
      "findById",
      "findMany",
      "create",
      "updateById",
      "deleteById",
      "count",
    ]),
    tasksRepository: createMockRepository([
      "findById",
      "findByNoteId",
      "findMany",
      "create",
      "updateById",
      "deleteById",
      "count",
    ]),
    eventsRepository: createMockRepository([
      "findById",
      "findByNoteId",
      "findMany",
      "create",
      "updateById",
      "deleteById",
      "count",
    ]),
    attachmentsRepository: createMockRepository([
      "findById",
      "findMany",
      "create",
      "updateById",
      "deleteById",
      "count",
    ]),
    noteTagsRepository: createMockRepository([
      "findByNoteIdAndTagId",
      "findByNoteId",
      "findByTagId",
      "create",
      "createMany",
      "deleteByNoteIdAndTagId",
      "deleteByNoteId",
      "deleteByTagId",
      "countByNoteId",
      "countByTagId",
    ]),
    integrationsRepository: createMockRepository([
      "findById",
      "findByUserIdAndProvider",
      "findMany",
      "create",
      "upsert",
      "updateById",
      "deleteById",
      "deleteByUserIdAndProvider",
      "count",
    ]),
    usersRepository: createMockRepository([
      "findById",
      "findByEmail",
      "findMany",
      "create",
      "updateById",
      "deleteById",
    ]),
  };
}
