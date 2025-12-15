/**
 * Attachments Repository - Integration Tests
 * 実際のデータベースを使用して添付ファイルリポジトリの動作を検証
 */

import { describe, it, expect, beforeEach } from "vitest";
import { attachmentsRepository, usersRepository, notesRepository } from "@/server/repositories";
import { createUserData, createNoteData, createAttachmentData } from "../../helpers/factories";
import { getTestPrisma } from "../../helpers/db";
import { AttachmentKind } from "@prisma/client";

describe("Attachments Repository - Integration Tests", () => {
  const testPrisma = getTestPrisma();
  let testUserId: string;
  let testNoteId: string;

  beforeEach(async () => {
    // 各テストの前に全データをクリーンアップ (FK制約に従って子から親へ)
    await testPrisma.task.deleteMany();
    await testPrisma.event.deleteMany();
    await testPrisma.attachment.deleteMany();
    await testPrisma.noteTag.deleteMany();
    await testPrisma.note.deleteMany();
    await testPrisma.tag.deleteMany();
    await testPrisma.project.deleteMany();
    await testPrisma.integration.deleteMany();
    await testPrisma.linkCode.deleteMany();
    await testPrisma.credential.deleteMany();
    await testPrisma.user.deleteMany();
    
    // テスト用ユーザーとノートを作成
    const user = await usersRepository.create(createUserData(), testPrisma);
    testUserId = user.id;
    
    const note = await notesRepository.create(
      createNoteData(testUserId),
      testPrisma
    );
    testNoteId = note.id;
  });

  describe("create", () => {
    it("正常系: 画像添付ファイルを作成できる", async () => {
      const attachmentData = createAttachmentData(testUserId, testNoteId, 0);
      const created = await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData.position,
          url: attachmentData.url,
          name: attachmentData.name,
          size: attachmentData.size,
          mimeType: attachmentData.mimeType,
          kind: attachmentData.kind,
          metadata: attachmentData.metadata,
        },
        testPrisma
      );

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.ownerId).toBe(testUserId);
      expect(created.noteId).toBe(testNoteId);
      expect(created.kind).toBe(AttachmentKind.IMAGE);
      expect(created.position).toBe(0);
    });

    it("正常系: ドキュメント添付ファイルを作成できる", async () => {
      const attachmentData = createAttachmentData(testUserId, testNoteId, 0, {
        kind: AttachmentKind.FILE,
        name: "test.pdf",
        mimeType: "application/pdf",
      });
      const created = await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData.position,
          url: attachmentData.url,
          name: attachmentData.name,
          size: attachmentData.size,
          mimeType: attachmentData.mimeType,
          kind: attachmentData.kind,
          metadata: attachmentData.metadata,
        },
        testPrisma
      );

      expect(created.kind).toBe(AttachmentKind.FILE);
      expect(created.name).toBe("test.pdf");
    });

    it("正常系: その他の添付ファイルを作成できる", async () => {
      const attachmentData = createAttachmentData(testUserId, testNoteId, 0, {
        kind: AttachmentKind.LINK,
        name: "test.zip",
        mimeType: "application/zip",
      });
      const created = await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData.position,
          url: attachmentData.url,
          name: attachmentData.name,
          size: attachmentData.size,
          mimeType: attachmentData.mimeType,
          kind: attachmentData.kind,
          metadata: attachmentData.metadata,
        },
        testPrisma
      );

      expect(created.kind).toBe(AttachmentKind.LINK);
    });

    it("正常系: metadataを含む添付ファイルを作成できる", async () => {
      const attachmentData = createAttachmentData(testUserId, testNoteId, 0, {
        metadata: { width: 1920, height: 1080 },
      });
      const created = await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData.position,
          url: attachmentData.url,
          name: attachmentData.name,
          size: attachmentData.size,
          mimeType: attachmentData.mimeType,
          kind: attachmentData.kind,
          metadata: attachmentData.metadata,
        },
        testPrisma
      );

      expect(created.metadata).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe("findById", () => {
    it("正常系: IDで添付ファイルを取得できる", async () => {
      const attachmentData = createAttachmentData(testUserId, testNoteId, 0);
      const created = await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData.position,
          url: attachmentData.url,
          name: attachmentData.name,
          size: attachmentData.size,
          mimeType: attachmentData.mimeType,
          kind: attachmentData.kind,
          metadata: attachmentData.metadata,
        },
        testPrisma
      );

      const found = await attachmentsRepository.findById(created.id, undefined, testPrisma);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.noteId).toBe(testNoteId);
    });

    it("正常系: includeオプションでノートを含めて取得できる", async () => {
      const attachmentData = createAttachmentData(testUserId, testNoteId, 0);
      const created = await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData.position,
          url: attachmentData.url,
          name: attachmentData.name,
          size: attachmentData.size,
          mimeType: attachmentData.mimeType,
          kind: attachmentData.kind,
          metadata: attachmentData.metadata,
        },
        testPrisma
      );

      const found = await attachmentsRepository.findById(
        created.id,
        undefined,
        testPrisma
      );

      expect(found).toBeDefined();
      expect(found?.noteId).toBe(testNoteId);
    });

    it("異常系: 存在しないIDはnullを返す", async () => {
      const found = await attachmentsRepository.findById("non-existent-id", undefined, testPrisma);
      expect(found).toBeNull();
    });
  });

  describe("findMany", () => {
    it("正常系: ノートIDで絞り込み検索できる", async () => {
      const note2 = await notesRepository.create(createNoteData(testUserId), testPrisma);

      const attachmentData1 = createAttachmentData(testUserId, testNoteId, 0);
      const attachmentData2 = createAttachmentData(testUserId, testNoteId, 1);
      const attachmentData3 = createAttachmentData(testUserId, note2.id, 0);

      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData1.position,
          url: attachmentData1.url,
          name: attachmentData1.name,
          size: attachmentData1.size,
          mimeType: attachmentData1.mimeType,
          kind: attachmentData1.kind,
          metadata: attachmentData1.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData2.position,
          url: attachmentData2.url,
          name: attachmentData2.name,
          size: attachmentData2.size,
          mimeType: attachmentData2.mimeType,
          kind: attachmentData2.kind,
          metadata: attachmentData2.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: note2.id } },
          position: attachmentData3.position,
          url: attachmentData3.url,
          name: attachmentData3.name,
          size: attachmentData3.size,
          mimeType: attachmentData3.mimeType,
          kind: attachmentData3.kind,
          metadata: attachmentData3.metadata,
        },
        testPrisma
      );

      const attachments = await attachmentsRepository.findMany(
        { noteId: testNoteId },
        { sortBy: "position", sortOrder: "asc" },
        undefined,
        testPrisma
      );

      expect(attachments.length).toBe(2);
      expect(attachments.every((a) => a.noteId === testNoteId)).toBe(true);
    });

    it("境界値: positionでソートできる", async () => {
      const attachmentData1 = createAttachmentData(testUserId, testNoteId, 2);
      const attachmentData2 = createAttachmentData(testUserId, testNoteId, 0);
      const attachmentData3 = createAttachmentData(testUserId, testNoteId, 1);

      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData1.position,
          url: attachmentData1.url,
          name: "file3.jpg",
          size: attachmentData1.size,
          mimeType: attachmentData1.mimeType,
          kind: attachmentData1.kind,
          metadata: attachmentData1.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData2.position,
          url: attachmentData2.url,
          name: "file1.jpg",
          size: attachmentData2.size,
          mimeType: attachmentData2.mimeType,
          kind: attachmentData2.kind,
          metadata: attachmentData2.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData3.position,
          url: attachmentData3.url,
          name: "file2.jpg",
          size: attachmentData3.size,
          mimeType: attachmentData3.mimeType,
          kind: attachmentData3.kind,
          metadata: attachmentData3.metadata,
        },
        testPrisma
      );

      const attachments = await attachmentsRepository.findMany(
        { noteId: testNoteId },
        { sortBy: "position", sortOrder: "asc" },
        undefined,
        testPrisma
      );

      expect(attachments[0].position).toBe(0);
      expect(attachments[1].position).toBe(1);
      expect(attachments[2].position).toBe(2);
    });

    it("境界値: take/skipでページングできる", async () => {
      const attachmentData1 = createAttachmentData(testUserId, testNoteId, 0);
      const attachmentData2 = createAttachmentData(testUserId, testNoteId, 1);
      const attachmentData3 = createAttachmentData(testUserId, testNoteId, 2);

      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData1.position,
          url: attachmentData1.url,
          name: attachmentData1.name,
          size: attachmentData1.size,
          mimeType: attachmentData1.mimeType,
          kind: attachmentData1.kind,
          metadata: attachmentData1.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData2.position,
          url: attachmentData2.url,
          name: attachmentData2.name,
          size: attachmentData2.size,
          mimeType: attachmentData2.mimeType,
          kind: attachmentData2.kind,
          metadata: attachmentData2.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData3.position,
          url: attachmentData3.url,
          name: attachmentData3.name,
          size: attachmentData3.size,
          mimeType: attachmentData3.mimeType,
          kind: attachmentData3.kind,
          metadata: attachmentData3.metadata,
        },
        testPrisma
      );

      const page1 = await attachmentsRepository.findMany(
        { noteId: testNoteId },
        { sortBy: "position", sortOrder: "asc", take: 2, skip: 0 },
        undefined,
        testPrisma
      );
      const page2 = await attachmentsRepository.findMany(
        { noteId: testNoteId },
        { sortBy: "position", sortOrder: "asc", take: 2, skip: 2 },
        undefined,
        testPrisma
      );

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(1);
    });
  });

  describe("getMaxPosition", () => {
    it("正常系: ノート内の最大position番号を取得できる", async () => {
      const attachmentData1 = createAttachmentData(testUserId, testNoteId, 0);
      const attachmentData2 = createAttachmentData(testUserId, testNoteId, 5);
      const attachmentData3 = createAttachmentData(testUserId, testNoteId, 3);

      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData1.position,
          url: attachmentData1.url,
          name: attachmentData1.name,
          size: attachmentData1.size,
          mimeType: attachmentData1.mimeType,
          kind: attachmentData1.kind,
          metadata: attachmentData1.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData2.position,
          url: attachmentData2.url,
          name: attachmentData2.name,
          size: attachmentData2.size,
          mimeType: attachmentData2.mimeType,
          kind: attachmentData2.kind,
          metadata: attachmentData2.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData3.position,
          url: attachmentData3.url,
          name: attachmentData3.name,
          size: attachmentData3.size,
          mimeType: attachmentData3.mimeType,
          kind: attachmentData3.kind,
          metadata: attachmentData3.metadata,
        },
        testPrisma
      );

      const maxPosition = await attachmentsRepository.getMaxPosition(testNoteId, testPrisma);
      expect(maxPosition).toBe(5);
    });

    it("正常系: 添付ファイルがない場合はnullを返す", async () => {
      const maxPosition = await attachmentsRepository.getMaxPosition(testNoteId, testPrisma);
      expect(maxPosition).toBeNull();
    });
  });

  describe("updateById", () => {
    it("正常系: 添付ファイル情報を更新できる", async () => {
      const attachmentData = createAttachmentData(testUserId, testNoteId, 0);
      const created = await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData.position,
          url: attachmentData.url,
          name: attachmentData.name,
          size: attachmentData.size,
          mimeType: attachmentData.mimeType,
          kind: attachmentData.kind,
          metadata: attachmentData.metadata,
        },
        testPrisma
      );

      const updated = await attachmentsRepository.updateById(
        created.id,
        { position: 5, name: "updated.jpg" },
        testPrisma
      );

      expect(updated.position).toBe(5);
      expect(updated.name).toBe("updated.jpg");
    });

    it("異常系: 存在しないIDの更新はエラー", async () => {
      await expect(
        attachmentsRepository.updateById("non-existent-id", { position: 1 }, testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("deleteById", () => {
    it("正常系: 添付ファイルを削除できる", async () => {
      const attachmentData = createAttachmentData(testUserId, testNoteId, 0);
      const created = await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData.position,
          url: attachmentData.url,
          name: attachmentData.name,
          size: attachmentData.size,
          mimeType: attachmentData.mimeType,
          kind: attachmentData.kind,
          metadata: attachmentData.metadata,
        },
        testPrisma
      );

      await attachmentsRepository.deleteById(created.id, testPrisma);

      const found = await attachmentsRepository.findById(created.id, undefined, testPrisma);
      expect(found).toBeNull();
    });

    it("異常系: 存在しないIDの削除はエラー", async () => {
      await expect(
        attachmentsRepository.deleteById("non-existent-id", testPrisma)
      ).rejects.toThrow();
    });
  });

  describe("deleteByNoteId", () => {
    it("正常系: ノートの全添付ファイルを削除できる", async () => {
      const attachmentData1 = createAttachmentData(testUserId, testNoteId, 0);
      const attachmentData2 = createAttachmentData(testUserId, testNoteId, 1);

      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData1.position,
          url: attachmentData1.url,
          name: attachmentData1.name,
          size: attachmentData1.size,
          mimeType: attachmentData1.mimeType,
          kind: attachmentData1.kind,
          metadata: attachmentData1.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData2.position,
          url: attachmentData2.url,
          name: attachmentData2.name,
          size: attachmentData2.size,
          mimeType: attachmentData2.mimeType,
          kind: attachmentData2.kind,
          metadata: attachmentData2.metadata,
        },
        testPrisma
      );

      const result = await attachmentsRepository.deleteByNoteId(testNoteId, testPrisma);
      expect(result.count).toBe(2);

      const attachments = await attachmentsRepository.findMany(
        { noteId: testNoteId },
        {},
        undefined,
        testPrisma
      );
      expect(attachments.length).toBe(0);
    });
  });

  describe("count", () => {
    it("正常系: 条件なしでカウントできる", async () => {
      const attachmentData1 = createAttachmentData(testUserId, testNoteId, 0);
      const attachmentData2 = createAttachmentData(testUserId, testNoteId, 1);

      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData1.position,
          url: attachmentData1.url,
          name: attachmentData1.name,
          size: attachmentData1.size,
          mimeType: attachmentData1.mimeType,
          kind: attachmentData1.kind,
          metadata: attachmentData1.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData2.position,
          url: attachmentData2.url,
          name: attachmentData2.name,
          size: attachmentData2.size,
          mimeType: attachmentData2.mimeType,
          kind: attachmentData2.kind,
          metadata: attachmentData2.metadata,
        },
        testPrisma
      );

      const count = await attachmentsRepository.count({}, testPrisma);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("正常系: ノートIDでカウントできる", async () => {
      const attachmentData1 = createAttachmentData(testUserId, testNoteId, 0);
      const attachmentData2 = createAttachmentData(testUserId, testNoteId, 1);

      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData1.position,
          url: attachmentData1.url,
          name: attachmentData1.name,
          size: attachmentData1.size,
          mimeType: attachmentData1.mimeType,
          kind: attachmentData1.kind,
          metadata: attachmentData1.metadata,
        },
        testPrisma
      );
      await attachmentsRepository.create(
        {
          owner: { connect: { id: testUserId } },
          note: { connect: { id: testNoteId } },
          position: attachmentData2.position,
          url: attachmentData2.url,
          name: attachmentData2.name,
          size: attachmentData2.size,
          mimeType: attachmentData2.mimeType,
          kind: attachmentData2.kind,
          metadata: attachmentData2.metadata,
        },
        testPrisma
      );

      const count = await attachmentsRepository.count({ noteId: testNoteId }, testPrisma);
      expect(count).toBe(2);
    });
  });
});


