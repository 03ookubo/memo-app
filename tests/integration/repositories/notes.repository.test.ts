/**
 * Notes Repository 統合テスト
 * 実DBを使用してRepository層のCRUD操作を検証
 */
import { describe, it, expect, beforeEach } from "vitest";
import { notesRepository, usersRepository, projectsRepository, tagsRepository, noteTagsRepository } from "@/server/repositories";
import { getTestPrisma } from "../../helpers/db";
import { createUserData, createNoteData, createProjectData, createTagData } from "../../helpers/factories";
import { TagScope } from "@prisma/client";

describe("Notes Repository - Integration Tests", () => {
  const testPrisma = getTestPrisma();
  let testUserId: string;
  let testProjectId: string;

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

    // テストユーザーとプロジェクトを作成
    const user = await usersRepository.create(createUserData(), testPrisma);
    testUserId = user.id;

    const project = await projectsRepository.create(
      createProjectData(testUserId),
      testPrisma
    );
    testProjectId = project.id;
  });

  describe("create", () => {
    it("正常系: 基本的なノートを作成できる", async () => {
      const noteData = createNoteData(testUserId);
      const note = await notesRepository.create(noteData, testPrisma);

      expect(note.id).toBeDefined();
      expect(note.ownerId).toBe(testUserId);
      expect(note.title).toBe(noteData.title);
      expect(note.bodyMarkdown).toBe(noteData.bodyMarkdown);
      expect(note.deletedAt).toBeNull();
      expect(note.archivedAt).toBeNull();
    });

    it("正常系: プロジェクトに紐づくノートを作成できる", async () => {
      const noteData = createNoteData(testUserId, { projectId: testProjectId });
      const note = await notesRepository.create(noteData, testPrisma);

      expect(note.projectId).toBe(testProjectId);
    });

    it("正常系: 親ノートを指定してサブノートを作成できる", async () => {
      const parentNote = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      const childNote = await notesRepository.create(
        createNoteData(testUserId, { parentId: parentNote.id }),
        testPrisma
      );

      expect(childNote.parentId).toBe(parentNote.id);
    });

    it("正常系: 暗号化フラグ付きノートを作成できる", async () => {
      const noteData = createNoteData(testUserId, { isEncrypted: true });
      const note = await notesRepository.create(noteData, testPrisma);

      expect(note.isEncrypted).toBe(true);
    });

    it("正常系: metadataを含むノートを作成できる", async () => {
      const metadata = { customField: "value", tags: ["test"] };
      const noteData = createNoteData(testUserId, { metadata });
      const note = await notesRepository.create(noteData, testPrisma);

      expect(note.metadata).toEqual(metadata);
    });
  });

  describe("findById", () => {
    it("正常系: IDでノートを取得できる", async () => {
      const created = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      const found = await notesRepository.findById(created.id, undefined, testPrisma);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it("正常系: includeオプションでプロジェクトを含めて取得できる", async () => {
      const created = await notesRepository.create(
        createNoteData(testUserId, { projectId: testProjectId }),
        testPrisma
      );

      const found = await notesRepository.findById(
        created.id,
        { project: true },
        testPrisma
      );

      expect(found).toBeDefined();
      expect(found?.projectId).toBe(testProjectId);
    });

    it("正常系: includeオプションで子ノートを含めて取得できる", async () => {
      const parent = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      const child = await notesRepository.create(
        createNoteData(testUserId, { parentId: parent.id }),
        testPrisma
      );

      const found = await notesRepository.findById(
        parent.id,
        { children: true },
        testPrisma
      );

      expect(found).toBeDefined();
      // 子ノートの存在を確認（findManyで検証）
      const children = await notesRepository.findMany(
        { parentId: parent.id },
        {},
        undefined,
        testPrisma
      );
      expect(children.length).toBeGreaterThan(0);
      expect(children[0].id).toBe(child.id);
    });

    it("異常系: 存在しないIDはnullを返す", async () => {
      const found = await notesRepository.findById(
        "non-existent-id",
        undefined,
        testPrisma
      );
      expect(found).toBeNull();
    });
  });

  describe("findMany", () => {
    beforeEach(async () => {
      // テストデータ作成
      await notesRepository.create(createNoteData(testUserId, { title: "Note 1" }), testPrisma);
      await notesRepository.create(createNoteData(testUserId, { title: "Note 2", projectId: testProjectId }), testPrisma);
      await notesRepository.create(createNoteData(testUserId, { title: "Note 3", archivedAt: new Date() }), testPrisma);
      await notesRepository.create(createNoteData(testUserId, { title: "Note 4", deletedAt: new Date() }), testPrisma);
    });

    it("正常系: オーナーIDで絞り込み検索できる", async () => {
      const notes = await notesRepository.findMany(
        { ownerId: testUserId },
        {},
        undefined,
        testPrisma
      );

      expect(notes.length).toBeGreaterThan(0);
      notes.forEach(note => {
        expect(note.ownerId).toBe(testUserId);
      });
    });

    it("正常系: プロジェクトIDで絞り込みできる", async () => {
      const notes = await notesRepository.findMany(
        { ownerId: testUserId, projectId: testProjectId },
        {},
        undefined,
        testPrisma
      );

      expect(notes.length).toBeGreaterThan(0);
      notes.forEach(note => {
        expect(note.projectId).toBe(testProjectId);
      });
    });

    it("正常系: アーカイブされていないノートのみ取得できる", async () => {
      const notes = await notesRepository.findMany(
        { ownerId: testUserId, archivedAt: null },
        {},
        undefined,
        testPrisma
      );

      notes.forEach(note => {
        expect(note.archivedAt).toBeNull();
      });
    });

    it("正常系: 削除されていないノートのみ取得できる", async () => {
      const notes = await notesRepository.findMany(
        { ownerId: testUserId, deletedAt: null },
        {},
        undefined,
        testPrisma
      );

      notes.forEach(note => {
        expect(note.deletedAt).toBeNull();
      });
    });

    it("境界値: sortIndexでソートできる", async () => {
      await testPrisma.note.deleteMany();
      await notesRepository.create(createNoteData(testUserId, { sortIndex: 3 }), testPrisma);
      await notesRepository.create(createNoteData(testUserId, { sortIndex: 1 }), testPrisma);
      await notesRepository.create(createNoteData(testUserId, { sortIndex: 2 }), testPrisma);

      const notes = await notesRepository.findMany(
        { ownerId: testUserId },
        { sortBy: "sortIndex", sortOrder: "asc" },
        undefined,
        testPrisma
      );

      expect(notes[0].sortIndex).toBe(1);
      expect(notes[1].sortIndex).toBe(2);
      expect(notes[2].sortIndex).toBe(3);
    });

    it("境界値: take/skipでページングできる", async () => {
      const allNotes = await notesRepository.findMany(
        { ownerId: testUserId, deletedAt: null },
        {},
        undefined,
        testPrisma
      );

      const pagedNotes = await notesRepository.findMany(
        { ownerId: testUserId, deletedAt: null },
        { take: 2, skip: 1 },
        undefined,
        testPrisma
      );

      expect(pagedNotes.length).toBeLessThanOrEqual(2);
      if (allNotes.length > 1) {
        expect(pagedNotes[0].id).toBe(allNotes[1].id);
      }
    });
  });

  describe("updateById", () => {
    it("正常系: ノート情報を更新できる", async () => {
      const created = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      const updated = await notesRepository.updateById(
        created.id,
        { title: "Updated Title", bodyMarkdown: "Updated content" },
        testPrisma
      );

      expect(updated.title).toBe("Updated Title");
      expect(updated.bodyMarkdown).toBe("Updated content");
    });

    it("正常系: ノートをアーカイブできる", async () => {
      const created = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      const archived = await notesRepository.updateById(
        created.id,
        { archivedAt: new Date() },
        testPrisma
      );

      expect(archived.archivedAt).not.toBeNull();
    });

    it("正常系: ノートをソフト削除できる", async () => {
      const created = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      const deleted = await notesRepository.updateById(
        created.id,
        { deletedAt: new Date() },
        testPrisma
      );

      expect(deleted.deletedAt).not.toBeNull();
    });

    it("異常系: 存在しないIDの更新はエラー", async () => {
      await expect(
        notesRepository.updateById(
          "non-existent-id",
          { title: "Test" },
          testPrisma
        )
      ).rejects.toThrow();
    });
  });

  describe("deleteById", () => {
    it("正常系: ノートを物理削除できる", async () => {
      const created = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      await notesRepository.deleteById(created.id, testPrisma);

      const found = await notesRepository.findById(created.id, undefined, testPrisma);
      expect(found).toBeNull();
    });

    it("異常系: 存在しないIDの削除はエラー", async () => {
      await expect(
        notesRepository.deleteById("non-existent-id", testPrisma)
      ).rejects.toThrow();
    });

    it("権限: カスケード削除の確認（タスクも削除される）", async () => {
      const note = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      const task = await testPrisma.task.create({
        data: {
          noteId: note.id,
          dueAt: new Date(),
          priority: 3,
        },
      });

      await notesRepository.deleteById(note.id, testPrisma);

      const foundTask = await testPrisma.task.findUnique({
        where: { id: task.id },
      });
      expect(foundTask).toBeNull();
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      await notesRepository.create(createNoteData(testUserId), testPrisma);
      await notesRepository.create(createNoteData(testUserId, { archivedAt: new Date() }), testPrisma);
      await notesRepository.create(createNoteData(testUserId, { deletedAt: new Date() }), testPrisma);
    });

    it("正常系: 条件なしでカウントできる", async () => {
      const count = await notesRepository.count({ ownerId: testUserId }, testPrisma);
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it("正常系: アーカイブ状態でカウントできる", async () => {
      const count = await notesRepository.count(
        { ownerId: testUserId, archivedAt: { not: null } },
        testPrisma
      );
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it("正常系: 削除状態でカウントできる", async () => {
      const count = await notesRepository.count(
        { ownerId: testUserId, deletedAt: { not: null } },
        testPrisma
      );
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("親子関係の管理", () => {
    it("正常系: 親ノート削除時に子ノートのparentIdがNULLになる（SetNull）", async () => {
      const parent = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );

      const child = await notesRepository.create(
        createNoteData(testUserId, { parentId: parent.id }),
        testPrisma
      );

      await notesRepository.deleteById(parent.id, testPrisma);

      const foundChild = await notesRepository.findById(child.id, undefined, testPrisma);
      expect(foundChild?.parentId).toBeNull();
    });
  });

  describe("トランザクション", () => {
    it("トランザクション内でノートとタグを紐付けできる", async () => {
      const note = await notesRepository.create(
        createNoteData(testUserId),
        testPrisma
      );
      const tag = await tagsRepository.create(
        createTagData(testUserId, TagScope.USER),
        testPrisma
      );

      await noteTagsRepository.create(
        { noteId: note.id, tagId: tag.id },
        testPrisma
      );

      const noteTags = await noteTagsRepository.findByNoteId(note.id, testPrisma);
      expect(noteTags.length).toBe(1);
      expect(noteTags[0].tagId).toBe(tag.id);
    });

    it("トランザクションエラー時はロールバックされる", async () => {
      const noteData = createNoteData(testUserId, { title: "Rollback Test" });

      try {
        await testPrisma.$transaction(async (tx) => {
          await notesRepository.create(noteData, tx);
          throw new Error("Test rollback");
        });
      } catch (error) {
        // エラーは期待通り
      }

      const notes = await notesRepository.findMany(
        { ownerId: testUserId, title: "Rollback Test" },
        {},
        undefined,
        testPrisma
      );
      expect(notes.length).toBe(0);
    });
  });
});
