# Service Layer API リファレンス

このドキュメントは `src/server/services/` に実装されたサービス層の関数一覧です。
API Route や Server Component からこれらの関数を呼び出してビジネスロジックを実行します。

## 目次

- [Note Service](#note-service)
- [Project Service](#project-service)
- [Tag Service](#tag-service)
- [Task Service](#task-service)
- [Attachment Service](#attachment-service)
- [User Service](#user-service)
- [Storage Service](#storage-service)
- [共通型](#共通型)

---

## Note Service

**パス**: `src/server/services/notes/`

メモの CRUD、アーカイブ、ソフトデリートを管理します。

### 読み取り（note.read.service.ts）

| 関数                | 説明                     | 引数               | 戻り値                  |
| ------------------- | ------------------------ | ------------------ | ----------------------- |
| `listActiveNotes`   | アクティブなノート一覧   | `ListNotesInput`   | `PaginatedResult<Note>` |
| `listArchivedNotes` | アーカイブ済みノート一覧 | `ListNotesInput`   | `PaginatedResult<Note>` |
| `listDeletedNotes`  | ゴミ箱内ノート一覧       | `ListNotesInput`   | `PaginatedResult<Note>` |
| `getNoteById`       | ID でノート取得          | `id: string`       | `Note`                  |
| `listChildNotes`    | 子ノート一覧             | `parentId: string` | `Note[]`                |

```typescript
// 使用例
const notes = await listActiveNotes({
  ownerId: "user-123",
  projectId: "project-456", // optional
  tagId: "tag-789", // optional
  search: "検索キーワード", // optional
  pagination: { page: 1, limit: 20 },
});
```

### 書き込み（note.write.service.ts）

| 関数                  | 説明                 | 引数                      | 戻り値 |
| --------------------- | -------------------- | ------------------------- | ------ |
| `createNote`          | ノート作成           | `CreateNoteInput`         | `Note` |
| `updateNote`          | ノート更新           | `id, UpdateNoteInput`     | `Note` |
| `addTaskToNote`       | ノートにタスク追加   | `noteId, CreateTaskInput` | `Task` |
| `removeTaskFromNote`  | ノートからタスク削除 | `noteId`                  | `void` |
| `updateNoteSortIndex` | 並び順更新           | `id, sortIndex`           | `Note` |

```typescript
// 使用例: ノート作成（タグ・タスク同時作成）
const note = await createNote({
  ownerId: "user-123",
  title: "新しいメモ",
  bodyMarkdown: "# 本文\n\n内容...",
  tagIds: ["tag-1", "tag-2"],
  task: {
    dueAt: new Date("2024-12-31"),
    priority: 1,
  },
});
```

### アーカイブ（note.archive.service.ts）

| 関数             | 説明               | 引数    | 戻り値 |
| ---------------- | ------------------ | ------- | ------ |
| `archiveNote`    | アーカイブ         | `id`    | `Note` |
| `unarchiveNote`  | アーカイブ解除     | `id`    | `Note` |
| `archiveNotes`   | 一括アーカイブ     | `ids[]` | `void` |
| `unarchiveNotes` | 一括アーカイブ解除 | `ids[]` | `void` |

### 削除（note.delete.service.ts）

| 関数              | 説明             | 引数      | 戻り値              |
| ----------------- | ---------------- | --------- | ------------------- |
| `softDeleteNote`  | ゴミ箱へ移動     | `id`      | `Note`              |
| `restoreNote`     | ゴミ箱から復元   | `id`      | `Note`              |
| `hardDeleteNote`  | 完全削除         | `id`      | `void`              |
| `softDeleteNotes` | 一括ソフト削除   | `ids[]`   | `void`              |
| `restoreNotes`    | 一括復元         | `ids[]`   | `void`              |
| `emptyTrash`      | ゴミ箱を空にする | `ownerId` | `number` (削除件数) |

---

## Project Service

**パス**: `src/server/services/projects/project.service.ts`

プロジェクト（メモのグループ化）を管理します。

| 関数                   | 説明                         | 引数                     | 戻り値                     |
| ---------------------- | ---------------------------- | ------------------------ | -------------------------- |
| `listActiveProjects`   | アクティブなプロジェクト一覧 | `ListProjectsInput`      | `PaginatedResult<Project>` |
| `listArchivedProjects` | アーカイブ済み一覧           | `ListProjectsInput`      | `PaginatedResult<Project>` |
| `getProjectById`       | ID で取得                    | `id`                     | `Project`                  |
| `createProject`        | 作成                         | `CreateProjectInput`     | `Project`                  |
| `updateProject`        | 更新                         | `id, UpdateProjectInput` | `Project`                  |
| `archiveProject`       | アーカイブ                   | `id`                     | `Project`                  |
| `unarchiveProject`     | アーカイブ解除               | `id`                     | `Project`                  |
| `softDeleteProject`    | ソフト削除                   | `id`                     | `Project`                  |
| `restoreProject`       | 復元                         | `id`                     | `Project`                  |
| `hardDeleteProject`    | 完全削除                     | `id`                     | `void`                     |
| `getProjectNoteCount`  | 所属ノート数                 | `id`                     | `number`                   |

```typescript
// 使用例
const project = await createProject({
  ownerId: "user-123",
  name: "仕事",
  description: "業務関連のメモ",
  emoji: "💼",
});
```

---

## Tag Service

**パス**: `src/server/services/tags/tag.service.ts`

タグ（SYSTEM/USER スコープ）とノートへの紐付けを管理します。

### タグ CRUD

| 関数              | 説明             | 引数                    | 戻り値                 |
| ----------------- | ---------------- | ----------------------- | ---------------------- |
| `listTags`        | タグ一覧         | `ListTagsInput`         | `PaginatedResult<Tag>` |
| `listUserTags`    | ユーザータグのみ | `ownerId`               | `Tag[]`                |
| `listSystemTags`  | システムタグのみ | -                       | `Tag[]`                |
| `getTagById`      | ID で取得        | `id`                    | `Tag`                  |
| `findTagByName`   | 名前で検索       | `name, scope, ownerId?` | `Tag \| null`          |
| `createTag`       | 作成             | `CreateTagInput`        | `Tag`                  |
| `updateTag`       | 更新             | `id, UpdateTagInput`    | `Tag`                  |
| `deleteTag`       | 削除             | `id`                    | `void`                 |
| `getTagNoteCount` | タグ付きノート数 | `id`                    | `number`               |

### ノートへのタグ付け

| 関数                | 説明             | 引数               | 戻り値  |
| ------------------- | ---------------- | ------------------ | ------- |
| `addTagToNote`      | タグを追加       | `noteId, tagId`    | `void`  |
| `removeTagFromNote` | タグを削除       | `noteId, tagId`    | `void`  |
| `getTagsForNote`    | ノートのタグ一覧 | `noteId`           | `Tag[]` |
| `setTagsForNote`    | タグを一括設定   | `noteId, tagIds[]` | `void`  |

```typescript
// 使用例: ユーザータグ作成
const tag = await createTag({
  scope: "USER",
  ownerId: "user-123",
  name: "重要",
  color: "#ff0000",
  description: "重要なメモ",
});

// ノートにタグ付け
await addTagToNote("note-456", tag.id);
```

---

## Task Service

**パス**: `src/server/services/tasks/task.service.ts`

ノートに紐づくタスク（期限・優先度・完了状態）を管理します。

### タスク CRUD

| 関数                   | 説明             | 引数                  | 戻り値                  |
| ---------------------- | ---------------- | --------------------- | ----------------------- |
| `listTasks`            | タスク一覧       | `ListTasksInput`      | `PaginatedResult<Task>` |
| `listUncompletedTasks` | 未完了タスク     | `ownerId`             | `Task[]`                |
| `listCompletedTasks`   | 完了タスク       | `ownerId`             | `Task[]`                |
| `getTaskById`          | ID で取得        | `id`                  | `Task`                  |
| `getTaskByNoteId`      | ノート ID で取得 | `noteId`              | `Task \| null`          |
| `createTask`           | 作成             | `CreateTaskInput`     | `Task`                  |
| `updateTask`           | 更新             | `id, UpdateTaskInput` | `Task`                  |
| `deleteTask`           | 削除             | `id`                  | `void`                  |
| `deleteTaskByNoteId`   | ノート ID で削除 | `noteId`              | `void`                  |

### 完了/未完了操作

| 関数                   | 説明               | 引数 | 戻り値 |
| ---------------------- | ------------------ | ---- | ------ |
| `completeTask`         | 完了にする         | `id` | `Task` |
| `uncompleteTask`       | 未完了に戻す       | `id` | `Task` |
| `toggleTaskCompletion` | 完了状態を切り替え | `id` | `Task` |

### 期限関連

| 関数                | 説明                  | 引数            | 戻り値   |
| ------------------- | --------------------- | --------------- | -------- |
| `listUpcomingTasks` | 今後 N 日以内のタスク | `ownerId, days` | `Task[]` |
| `listOverdueTasks`  | 期限切れタスク        | `ownerId`       | `Task[]` |

```typescript
// 使用例: 期限切れタスクを取得
const overdue = await listOverdueTasks("user-123");

// 完了にする
await completeTask("task-456");
```

---

## Attachment Service

**パス**: `src/server/services/attachments/attachment.service.ts`

添付ファイルのメタデータ、Storage 連携、レイアウト管理を行います。

### 基本 CRUD

| 関数                          | 説明               | 引数                        | 戻り値                        |
| ----------------------------- | ------------------ | --------------------------- | ----------------------------- |
| `listAttachmentsForNote`      | ノートの添付一覧   | `ListAttachmentsInput`      | `PaginatedResult<Attachment>` |
| `getAttachmentById`           | ID で取得          | `id`                        | `Attachment`                  |
| `createAttachment`            | 作成（URL 指定）   | `CreateAttachmentInput`     | `Attachment`                  |
| `updateAttachment`            | 更新               | `id, UpdateAttachmentInput` | `Attachment`                  |
| `deleteAttachment`            | 削除（DB のみ）    | `id`                        | `void`                        |
| `deleteAllAttachmentsForNote` | ノートの添付全削除 | `noteId`                    | `void`                        |

### 並び順・ユーティリティ

| 関数                            | 説明                  | 引数                       | 戻り値                        |
| ------------------------------- | --------------------- | -------------------------- | ----------------------------- |
| `reorderAttachments`            | 並び順を一括更新      | `noteId, [{id, position}]` | `void`                        |
| `getAttachmentCountForNote`     | 添付数                | `noteId`                   | `number`                      |
| `getTotalAttachmentSizeForNote` | 合計サイズ            | `noteId`                   | `number`                      |
| `listAttachmentsByMimeType`     | MIME タイプでフィルタ | `noteId, mimeTypePrefix`   | `PaginatedResult<Attachment>` |
| `listImageAttachments`          | 画像のみ              | `noteId`                   | `PaginatedResult<Attachment>` |

### Storage 連携

| 関数                                     | 説明                       | 引数                             | 戻り値           |
| ---------------------------------------- | -------------------------- | -------------------------------- | ---------------- |
| `uploadAndCreateAttachment`              | アップロード + DB 作成     | `UploadAndCreateAttachmentInput` | `Attachment`     |
| `deleteAttachmentWithStorage`            | Storage + DB 削除          | `id`                             | `void`           |
| `deleteAllAttachmentsWithStorageForNote` | 全添付を Storage + DB 削除 | `noteId`                         | `void`           |
| `getAttachmentPublicUrl`                 | 公開 URL 取得              | `attachment`                     | `string`         |
| `getAttachmentSignedUrl`                 | 署名付き URL 取得          | `attachment, expiresIn?`         | `string`         |
| `inferAttachmentKind`                    | MIME タイプから種別推定    | `mimeType?`                      | `AttachmentKind` |

### レイアウト管理

| 関数                      | 説明               | 引数              | 戻り値                     |
| ------------------------- | ------------------ | ----------------- | -------------------------- |
| `getAttachmentLayout`     | レイアウト情報取得 | `attachment`      | `AttachmentLayout \| null` |
| `buildAttachmentMetadata` | metadata 構築      | `layout?, extra?` | `AttachmentMetadata`       |
| `updateAttachmentLayout`  | レイアウト更新     | `id, layout`      | `Attachment`               |

```typescript
// 使用例: 画像アップロード
const attachment = await uploadAndCreateAttachment({
  file: imageBuffer,
  fileName: "photo.jpg",
  ownerId: "user-123",
  noteId: "note-456",
  mimeType: "image/jpeg",
  // kind は mimeType から自動推定
  layout: {
    width: "50%",
    align: "center",
  },
});
```

### レイアウト型定義

```typescript
interface AttachmentLayout {
  insertAfterLine?: number; // 本文内の挿入位置（行番号）
  width?: string; // "50%", "300px", "full"
  height?: string; // "auto", "200px"
  align?: "left" | "center" | "right";
  caption?: string; // キャプション
  alt?: string; // 代替テキスト
}
```

---

## User Service

**パス**: `src/server/services/users/user.service.ts`

ユーザー管理（認証連携用）を行います。

| 関数          | 説明         | 引数             | 戻り値                  |
| ------------- | ------------ | ---------------- | ----------------------- |
| `listUsers`   | ユーザー一覧 | `ListUsersInput` | `PaginatedResult<User>` |
| `getUserById` | ID で取得    | `id`             | `User`                  |
| `createUser`  | 作成         | -                | `User`                  |
| `deleteUser`  | 削除         | `id`             | `void`                  |

---

## Storage Service

**パス**: `src/server/storage/storage.service.ts`

Supabase Storage との連携を行います。Attachment Service から内部的に使用されます。

| 関数              | 説明                 | 引数                               | 戻り値             |
| ----------------- | -------------------- | ---------------------------------- | ------------------ |
| `uploadFile`      | ファイルアップロード | `UploadFileInput`                  | `UploadFileResult` |
| `deleteFile`      | ファイル削除         | `DeleteFileInput`                  | `void`             |
| `deleteFiles`     | 一括削除             | `storagePaths[], bucket?`          | `void`             |
| `getPublicUrl`    | 公開 URL 取得        | `storagePath, bucket?`             | `string`           |
| `getSignedUrl`    | 署名付き URL 取得    | `storagePath, expiresIn?, bucket?` | `string`           |
| `fileExists`      | 存在確認             | `storagePath, bucket?`             | `boolean`          |
| `getFileMetadata` | メタデータ取得       | `storagePath, bucket?`             | `{size, mimeType}` |

---

## 共通型

**パス**: `src/server/services/types.ts`

### ServiceError

```typescript
class ServiceError extends Error {
  code: ServiceErrorCode;
  details?: Record<string, unknown>;
}

type ServiceErrorCode =
  | "NOT_FOUND" // 404
  | "ALREADY_EXISTS" // 409
  | "VALIDATION_ERROR" // 400
  | "PERMISSION_DENIED" // 403
  | "CONFLICT" // 409
  | "INTERNAL_ERROR" // 500
  | "CONFIGURATION_ERROR" // 500
  | "STORAGE_ERROR" // 500
  | "INVALID_OPERATION"; // 400
```

### ページネーション

```typescript
interface PaginationInput {
  page?: number; // デフォルト: 1
  limit?: number; // デフォルト: 20
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## 呼び出し例（API Route）

```typescript
// src/app/api/notes/route.ts
import { listActiveNotes, createNote, ServiceError } from "@/server/services";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ownerId = "current-user-id"; // 認証から取得

  const result = await listActiveNotes({
    ownerId,
    search: searchParams.get("q") ?? undefined,
    pagination: {
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
    },
  });

  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const note = await createNote({
      ownerId: "current-user-id",
      ...body,
    });
    return Response.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: errorCodeToStatus[error.code] }
      );
    }
    throw error;
  }
}
```

---

## 更新履歴

| 日付       | 内容                             |
| ---------- | -------------------------------- |
| 2024-12-01 | 初版作成。全サービス関数を文書化 |
