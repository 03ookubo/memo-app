# テスト仕様書

## 概要

本プロジェクトでは **Vitest** を使用して Service レイヤーの単体テストと Repository レイヤーの統合テストを実施しています。

### テスト方針

- **Service テスト**: Repository をモック化し、ビジネスロジックを検証（単体テスト）
- **Repository テスト**: 実際の PostgreSQL（Supabase）を使用し、データ操作を検証（統合テスト）

### テスト実行コマンド

```bash
# Service テスト（単体テスト）
npm run test          # ウォッチモードで実行
npm run test:run      # 単発実行
npm run test:coverage # カバレッジレポート付き

# Repository テスト（統合テスト）
npx vitest run --config vitest.config.integration.ts
```

---

## テスト統計

### Service テスト（単体テスト）

| カテゴリ    | ファイル数 | テスト数 |
| :---------- | :--------: | :------: |
| Notes       |     4      |    36    |
| Projects    |     1      |    13    |
| Tags        |     1      |    11    |
| Tasks       |     1      |    11    |
| Attachments |     1      |    9     |
| Users       |     1      |    7     |
| **合計**    |   **9**    |  **87**  |

### Repository テスト（統合テスト）

| カテゴリ    | ファイル数 | テスト数 |
| :---------- | :--------: | :------: |
| Users       |     1      |    14    |
| Projects    |     1      |    19    |
| Tags        |     1      |    24    |
| Notes       |     1      |    26    |
| NoteTags    |     1      |    17    |
| Attachments |     1      |    24    |
| Tasks       |     1      |    25    |
| **合計**    |   **7**    | **149**  |

---

## Service テスト詳細

Service テストは Repository をモック化した単体テストです。

### 1. Note Read Service (`note.read.service.test.ts`)

ノートの読み取り操作に関するテスト。

| #   | テストケース     | テスト内容                   | 保証される動作                      |
| --- | ---------------- | ---------------------------- | ----------------------------------- |
| 1.1 | ノート一覧取得   | `listActiveNotes` を呼び出し | ページネーション付きで一覧を返す    |
| 1.2 | 空の一覧         | ノートが存在しない場合       | 空配列と total=0 を返す             |
| 1.3 | タグフィルタ     | tagId を指定                 | 該当タグのノートのみ返す            |
| 1.4 | 検索フィルタ     | search キーワード指定        | タイトル/本文に一致するノートを返す |
| 1.5 | ページネーション | page=2, limit=10             | 正しい skip/take でクエリ実行       |
| 1.6 | 削除済み除外     | deletedAt 条件               | deletedAt=null のみ取得             |
| 1.7 | アーカイブ除外   | archivedAt 条件              | archivedAt=null のみ取得            |
| 2.1 | アーカイブ一覧   | `listArchivedNotes`          | archivedAt が設定されたノートのみ   |
| 3.1 | ゴミ箱一覧       | `listDeletedNotes`           | deletedAt が設定されたノートのみ    |
| 4.1 | ノート取得       | `getNoteById`                | 指定 ID のノートを返す              |
| 4.2 | 存在しない       | 無効な ID                    | NOT_FOUND エラー                    |
| 4.3 | 権限なし         | 他ユーザーの ownerId         | PERMISSION_DENIED エラー            |

**保証される品質:**

- ✅ アクティブ/アーカイブ/削除済みの 3 状態が正しく分離される
- ✅ ユーザーは自分のノートのみアクセス可能
- ✅ タグフィルタ・検索が正しく動作する

---

### 2. Note Write Service (`note.write.service.test.ts`)

ノートの作成・更新操作に関するテスト。

| #   | テストケース       | テスト内容                     | 保証される動作                 |
| --- | ------------------ | ------------------------------ | ------------------------------ |
| 1.1 | 基本的なノート作成 | title, bodyMarkdown 指定       | ノートが作成される             |
| 1.2 | 全項目指定         | projectId, parentId, sortIndex | 全フィールドが保存される       |
| 1.3 | タグ付き作成       | tagIds 配列指定                | トランザクションでタグ関連付け |
| 1.4 | タスク付き作成     | task オブジェクト指定          | トランザクションでタスク作成   |
| 1.5 | サブノート作成     | parentId 指定                  | 親ノートに紐付く               |
| 2.1 | タイトル更新       | `updateNote`                   | タイトルが更新される           |
| 2.2 | タグ同期           | 新しい tagIds                  | 既存タグ削除 → 新規追加        |
| 2.3 | プロジェクト解除   | projectId を null              | 紐付けが解除される             |
| 2.4 | 存在しない         | 無効な ID                      | NOT_FOUND エラー               |
| 2.5 | 権限なし           | 他ユーザー                     | PERMISSION_DENIED エラー       |

**保証される品質:**

- ✅ ノートとタグ/タスクがトランザクションで一貫性を持って作成される
- ✅ 階層構造（親子関係）が正しく設定される
- ✅ 所有者以外は更新できない

---

### 3. Note Archive Service (`note.archive.service.test.ts`)

ノートのアーカイブ/復元操作に関するテスト。

| #   | テストケース       | テスト内容         | 保証される動作           |
| --- | ------------------ | ------------------ | ------------------------ |
| 1.1 | アーカイブ         | `archiveNote`      | archivedAt が設定される  |
| 1.2 | 存在しない         | 無効な ID          | NOT_FOUND エラー         |
| 1.3 | 権限なし           | 他ユーザー         | PERMISSION_DENIED エラー |
| 1.4 | 二重アーカイブ     | 既にアーカイブ済み | CONFLICT エラー          |
| 2.1 | 復元               | `unarchiveNote`    | archivedAt が null に    |
| 2.2 | 未アーカイブを復元 | archivedAt=null    | CONFLICT エラー          |
| 3.1 | 一括アーカイブ     | `archiveNotes`     | 複数ノートを同時処理     |

**保証される品質:**

- ✅ 状態遷移が冪等でない（二重操作はエラー）
- ✅ 一括操作が正しく動作する

---

### 4. Note Delete Service (`note.delete.service.test.ts`)

ノートの削除（論理/物理）操作に関するテスト。

| #   | テストケース | テスト内容       | 保証される動作           |
| --- | ------------ | ---------------- | ------------------------ |
| 1.1 | 論理削除     | `softDeleteNote` | deletedAt が設定される   |
| 1.2 | 存在しない   | 無効な ID        | NOT_FOUND エラー         |
| 1.3 | 権限なし     | 他ユーザー       | PERMISSION_DENIED エラー |
| 1.4 | 二重削除     | 既に削除済み     | CONFLICT エラー          |
| 2.1 | 復元         | `restoreNote`    | deletedAt が null に     |
| 2.2 | 未削除を復元 | deletedAt=null   | CONFLICT エラー          |
| 3.1 | 物理削除     | `hardDeleteNote` | 関連データと共に完全削除 |

**保証される品質:**

- ✅ ソフトデリート（ゴミ箱）が正しく動作
- ✅ ハードデリートで関連データ（タグ、添付、タスク）も削除
- ✅ 復元機能が動作する

---

### 5. Project Service (`project.service.test.ts`)

プロジェクトの CRUD 操作に関するテスト。

| #   | テストケース     | テスト内容             | 保証される動作           |
| --- | ---------------- | ---------------------- | ------------------------ |
| 1.1 | アクティブ一覧   | `listActiveProjects`   | 未アーカイブのみ         |
| 1.2 | アーカイブ一覧   | `listArchivedProjects` | アーカイブ済みのみ       |
| 1.3 | ページネーション | page, limit 指定       | 正しくページング         |
| 2.1 | プロジェクト取得 | `getProjectById`       | 指定 ID を返す           |
| 2.2 | 存在しない       | 無効な ID              | NOT_FOUND エラー         |
| 2.3 | 権限なし         | 他ユーザー             | PERMISSION_DENIED エラー |
| 3.1 | 作成             | `createProject`        | プロジェクトが作成される |
| 3.2 | 名前重複         | 同名が既存             | ALREADY_EXISTS エラー    |
| 4.1 | 更新             | `updateProject`        | 情報が更新される         |
| 4.2 | 存在しない       | 無効な ID              | NOT_FOUND エラー         |
| 5.1 | アーカイブ       | `archiveProject`       | archivedAt 設定          |
| 5.2 | 復元             | `unarchiveProject`     | archivedAt=null          |
| 6.1 | 削除             | `softDeleteProject`    | deletedAt 設定           |

**保証される品質:**

- ✅ プロジェクト名はユーザー内で一意
- ✅ 所有者のみが操作可能

---

### 6. Tag Service (`tag.service.test.ts`)

タグの CRUD 操作に関するテスト。

| #   | テストケース     | テスト内容       | 保証される動作           |
| --- | ---------------- | ---------------- | ------------------------ |
| 1.1 | ユーザータグ一覧 | `listUserTags`   | ユーザー固有タグのみ     |
| 1.2 | システムタグ一覧 | `listSystemTags` | 共通タグのみ             |
| 1.3 | ページネーション | page, limit 指定 | 正しくページング         |
| 2.1 | 作成             | `createTag`      | タグが作成される         |
| 2.2 | 名前重複         | 同名が既存       | ALREADY_EXISTS エラー    |
| 2.3 | 色重複           | 同色が既存       | ALREADY_EXISTS エラー    |
| 3.1 | 更新             | `updateTag`      | 名前が更新される         |
| 3.2 | 存在しない       | 無効な ID        | NOT_FOUND エラー         |
| 3.3 | システムタグ編集 | scope=SYSTEM     | PERMISSION_DENIED エラー |
| 4.1 | 削除             | `deleteTag`      | タグが削除される         |
| 4.2 | システムタグ削除 | scope=SYSTEM     | PERMISSION_DENIED エラー |

**保証される品質:**

- ✅ タグ名・色はスコープ内で一意
- ✅ システムタグは編集/削除不可
- ✅ ユーザータグとシステムタグが分離

---

### 7. Task Service (`task.service.test.ts`)

タスクの CRUD 操作に関するテスト。

| #   | テストケース | テスト内容             | 保証される動作               |
| --- | ------------ | ---------------------- | ---------------------------- |
| 1.1 | 全タスク一覧 | `listTasks`            | 全タスクを返す               |
| 1.2 | 完了タスク   | `listCompletedTasks`   | completedAt が設定されたもの |
| 1.3 | 未完了タスク | `listUncompletedTasks` | completedAt=null             |
| 2.1 | タスク取得   | `getTaskById`          | 指定 ID を返す               |
| 2.2 | 存在しない   | 無効な ID              | NOT_FOUND エラー             |
| 3.1 | 作成         | `createTask`           | タスクが作成される           |
| 3.2 | 重複         | 同じ noteId            | ALREADY_EXISTS エラー        |
| 4.1 | 更新         | `updateTask`           | dueAt, priority 更新         |
| 5.1 | 完了         | `completeTask`         | completedAt 設定             |
| 5.2 | 未完了に戻す | `uncompleteTask`       | completedAt=null             |
| 6.1 | 削除         | `deleteTask`           | タスクが削除される           |

**保証される品質:**

- ✅ 1 つのノートに 1 つのタスクのみ
- ✅ 完了/未完了の状態管理

---

### 8. Attachment Service (`attachment.service.test.ts`)

添付ファイルの CRUD 操作に関するテスト。

| #   | テストケース     | テスト内容               | 保証される動作   |
| --- | ---------------- | ------------------------ | ---------------- |
| 1.1 | 一覧取得         | `listAttachmentsForNote` | ノートの添付一覧 |
| 1.2 | ページネーション | page, limit 指定         | 正しくページング |
| 2.1 | 取得             | `getAttachmentById`      | 指定 ID を返す   |
| 2.2 | 存在しない       | 無効な ID                | NOT_FOUND エラー |
| 3.1 | 作成             | `createAttachment`       | 添付が作成される |
| 3.2 | 位置自動設定     | position 未指定          | 最後尾に追加     |
| 4.1 | 更新             | `updateAttachment`       | 名前が更新される |
| 5.1 | 削除             | `deleteAttachment`       | 添付が削除される |
| 6.1 | 並べ替え         | `reorderAttachments`     | position 更新    |

**保証される品質:**

- ✅ 添付ファイルの順序管理
- ✅ ノート単位での添付管理

---

### 9. User Service (`user.service.test.ts`)

ユーザーの CRUD 操作に関するテスト。

| #   | テストケース     | テスト内容       | 保証される動作       |
| --- | ---------------- | ---------------- | -------------------- |
| 1.1 | 取得             | `getUserById`    | 指定 ID を返す       |
| 1.2 | 存在しない       | 無効な ID        | NOT_FOUND エラー     |
| 2.1 | 一覧取得         | `listUsers`      | ユーザー一覧         |
| 2.2 | ページネーション | page, limit 指定 | 正しくページング     |
| 3.1 | 作成             | `createUser`     | ユーザーが作成される |
| 4.1 | 削除             | `deleteUser`     | ユーザーが削除される |
| 4.2 | 存在しない       | 無効な ID        | NOT_FOUND エラー     |

**保証される品質:**

- ✅ ユーザーの基本的な CRUD 操作

---

## エラーコード一覧

テストで検証されているエラーコード:

| コード              | 意味                 | 発生条件                                         |
| :------------------ | :------------------- | :----------------------------------------------- |
| `NOT_FOUND`         | リソースが存在しない | 無効な ID で取得/更新/削除                       |
| `PERMISSION_DENIED` | 権限がない           | 他ユーザーのリソースにアクセス、システムタグ編集 |
| `ALREADY_EXISTS`    | 既に存在する         | 名前/色の重複、タスク重複                        |
| `CONFLICT`          | 状態が不正           | 二重アーカイブ、二重削除、未削除の復元           |

---

## テストの限界と今後の課題

### 現状でテストされていないもの

1. **API Routes**: HTTP エンドポイントの統合テスト
2. **認証レイヤー**: WebAuthn, Session の動作テスト
3. **フロントエンド**: React コンポーネントのテスト

### 改善の余地

- [ ] エッジケースの追加（大量データ、特殊文字など）
- [ ] パフォーマンステスト
- [ ] E2E テストの導入
- [ ] テストカバレッジの向上

---

## ファイル構成

```
tests/
└── server/
    ├── repositories/
    │   ├── setup.ts                          (共通セットアップ)
    │   ├── users.repository.test.ts          (14 tests)
    │   ├── projects.repository.test.ts       (19 tests)
    │   ├── tags.repository.test.ts           (24 tests)
    │   ├── notes.repository.test.ts          (26 tests)
    │   ├── note-tags.repository.test.ts      (17 tests)
    │   ├── attachments.repository.test.ts    (24 tests)
    │   └── tasks.repository.test.ts          (25 tests)
    └── services/
        ├── notes/
        │   ├── note.read.service.test.ts     (12 tests)
        │   ├── note.write.service.test.ts    (10 tests)
        │   ├── note.archive.service.test.ts  (7 tests)
        │   └── note.delete.service.test.ts   (7 tests)
        ├── projects/
        │   └── project.service.test.ts       (13 tests)
        ├── tags/
        │   └── tag.service.test.ts           (11 tests)
        ├── tasks/
        │   └── task.service.test.ts          (11 tests)
        ├── attachments/
        │   └── attachment.service.test.ts    (9 tests)
        └── users/
            └── user.service.test.ts          (7 tests)
```

---

## Repository テスト詳細

Repository テストは実際の PostgreSQL（Supabase）を使用した統合テストです。

### テスト環境

- **データベース**: 開発用 Supabase PostgreSQL
- **トランザクション**: 各テストは独立したクリーンアップを実施
- **実行モード**: シーケンシャル実行（データ競合を防止）

### 1. Users Repository (`users.repository.test.ts`)

| #    | テストケース       | テスト内容   | 保証される動作             |
| ---- | ------------------ | ------------ | -------------------------- |
| 1.1  | 新規ユーザー作成   | `create`     | ユーザーが作成される       |
| 1.2  | createdAt 自動設定 | `create`     | 日時が自動設定される       |
| 1.3  | ID で取得          | `findById`   | 指定 ID のユーザーを返す   |
| 1.4  | include オプション | `findById`   | credentials 含めて取得     |
| 1.5  | 存在しない場合     | `findById`   | null を返す                |
| 1.6  | 条件付き一覧取得   | `findMany`   | where 条件でフィルタリング |
| 1.7  | ソート             | `findMany`   | createdAt でソート可能     |
| 1.8  | ページング         | `findMany`   | take/skip で制限           |
| 1.9  | 更新               | `updateById` | ユーザー情報を更新         |
| 1.10 | 存在しない更新     | `updateById` | エラーになる               |
| 1.11 | 削除               | `deleteById` | ユーザーを削除             |
| 1.12 | 存在しない削除     | `deleteById` | エラーになる               |
| 1.13 | カウント           | `count`      | ユーザー数を取得           |
| 1.14 | 条件付きカウント   | `count`      | 条件に一致する数を取得     |

### 2. Projects Repository (`projects.repository.test.ts`)

| #    | テストケース       | テスト内容             | 保証される動作               |
| ---- | ------------------ | ---------------------- | ---------------------------- |
| 2.1  | プロジェクト作成   | `create`               | プロジェクトが作成される     |
| 2.2  | 全項目設定         | `create`               | 全フィールドが保存される     |
| 2.3  | 名前ユニーク制約   | `create`               | 同ユーザー・同名は重複エラー |
| 2.4  | 異ユーザー同名     | `create`               | 別ユーザーなら同名可能       |
| 2.5  | ID で取得          | `findById`             | 指定 ID を返す               |
| 2.6  | owner include      | `findById`             | owner 含めて取得             |
| 2.7  | 存在しない         | `findById`             | null を返す                  |
| 2.8  | オーナー名検索     | `findByOwnerIdAndName` | 名前で検索                   |
| 2.9  | 存在しない名前     | `findByOwnerIdAndName` | null を返す                  |
| 2.10 | 一覧取得           | `findMany`             | ownerId でフィルタ           |
| 2.11 | アーカイブフィルタ | `findMany`             | archivedAt 条件              |
| 2.12 | ソート             | `findMany`             | sortIndex でソート           |
| 2.13 | ページング         | `findMany`             | take/skip で制限             |
| 2.14 | 更新               | `updateById`           | 情報を更新                   |
| 2.15 | 存在しない更新     | `updateById`           | エラーになる                 |
| 2.16 | 削除               | `deleteById`           | プロジェクトを削除           |
| 2.17 | 存在しない削除     | `deleteById`           | エラーになる                 |
| 2.18 | カウント           | `count`                | 件数を取得                   |
| 2.19 | 条件付きカウント   | `count`                | ownerId で絞込               |

### 3. Tags Repository (`tags.repository.test.ts`)

| #    | テストケース             | テスト内容            | 保証される動作                           |
| ---- | ------------------------ | --------------------- | ---------------------------------------- |
| 3.1  | USER タグ作成            | `create`              | ユーザータグが作成される                 |
| 3.2  | SYSTEM タグ作成          | `create`              | システムタグが作成される（ownerId なし） |
| 3.3  | 名前ユニーク制約         | `create`              | 同スコープ・同名・同オーナーは重複エラー |
| 3.4  | 色ユニーク制約           | `create`              | 同スコープ・同色・同オーナーは重複エラー |
| 3.5  | 異オーナー同名           | `create`              | 別オーナーなら同名可能                   |
| 3.6  | ID で取得                | `findById`            | 指定 ID を返す                           |
| 3.7  | owner include            | `findById`            | owner 含めて取得                         |
| 3.8  | 存在しない               | `findById`            | null を返す                              |
| 3.9  | スコープ名検索（USER）   | `findByScopeAndName`  | USER スコープで名前検索                  |
| 3.10 | スコープ名検索（SYSTEM） | `findByScopeAndName`  | SYSTEM スコープで名前検索                |
| 3.11 | 存在しない名前           | `findByScopeAndName`  | null を返す                              |
| 3.12 | スコープ色検索           | `findByScopeAndColor` | 色で検索                                 |
| 3.13 | 存在しない色             | `findByScopeAndColor` | null を返す                              |
| 3.14 | 一覧取得                 | `findMany`            | ownerId でフィルタ                       |
| 3.15 | スコープフィルタ         | `findMany`            | scope でフィルタ                         |
| 3.16 | ソート                   | `findMany`            | name でソート                            |
| 3.17 | ページング               | `findMany`            | take/skip で制限                         |
| 3.18 | 更新                     | `updateById`          | 情報を更新                               |
| 3.19 | 存在しない更新           | `updateById`          | エラーになる                             |
| 3.20 | 削除                     | `deleteById`          | タグを削除                               |
| 3.21 | 存在しない削除           | `deleteById`          | エラーになる                             |
| 3.22 | カウント                 | `count`               | 件数を取得                               |
| 3.23 | 条件付きカウント         | `count`               | ownerId で絞込                           |
| 3.24 | スコープカウント         | `count`               | scope で絞込                             |

### 4. Notes Repository (`notes.repository.test.ts`)

| #    | テストケース         | テスト内容   | 保証される動作         |
| ---- | -------------------- | ------------ | ---------------------- |
| 4.1  | ノート作成           | `create`     | ノートが作成される     |
| 4.2  | プロジェクト紐付け   | `create`     | projectId で紐付け     |
| 4.3  | 親ノート紐付け       | `create`     | parentId で階層構造    |
| 4.4  | ID で取得            | `findById`   | 指定 ID を返す         |
| 4.5  | tags include         | `findById`   | タグ含めて取得         |
| 4.6  | project include      | `findById`   | プロジェクト含めて取得 |
| 4.7  | children include     | `findById`   | 子ノート含めて取得     |
| 4.8  | 存在しない           | `findById`   | null を返す            |
| 4.9  | 一覧取得             | `findMany`   | ownerId でフィルタ     |
| 4.10 | プロジェクトフィルタ | `findMany`   | projectId でフィルタ   |
| 4.11 | sortIndex ソート     | `findMany`   | sortIndex でソート     |
| 4.12 | title ソート         | `findMany`   | title でソート         |
| 4.13 | createdAt ソート     | `findMany`   | createdAt でソート     |
| 4.14 | アーカイブフィルタ   | `findMany`   | archivedAt 条件        |
| 4.15 | 削除フィルタ         | `findMany`   | deletedAt 条件         |
| 4.16 | ページング           | `findMany`   | take/skip で制限       |
| 4.17 | 更新                 | `updateById` | 情報を更新             |
| 4.18 | アーカイブ           | `updateById` | archivedAt を設定      |
| 4.19 | ソフト削除           | `updateById` | deletedAt を設定       |
| 4.20 | 存在しない更新       | `updateById` | エラーになる           |
| 4.21 | 物理削除             | `deleteById` | ノートを完全削除       |
| 4.22 | 存在しない削除       | `deleteById` | エラーになる           |
| 4.23 | カウント             | `count`      | 件数を取得             |
| 4.24 | ownerId カウント     | `count`      | ownerId で絞込         |
| 4.25 | アーカイブカウント   | `count`      | archivedAt で絞込      |
| 4.26 | 削除カウント         | `count`      | deletedAt で絞込       |

### 5. NoteTags Repository (`note-tags.repository.test.ts`)

| #    | テストケース           | テスト内容             | 保証される動作             |
| ---- | ---------------------- | ---------------------- | -------------------------- |
| 5.1  | 紐付け作成             | `create`               | ノートとタグを紐付け       |
| 5.2  | 重複紐付け             | `create`               | 同じ組み合わせはエラー     |
| 5.3  | 一括紐付け             | `createMany`           | 複数タグを一括紐付け       |
| 5.4  | 重複スキップ           | `createMany`           | skipDuplicates で重複無視  |
| 5.5  | 紐付け取得             | `findByNoteIdAndTagId` | 特定の紐付けを取得         |
| 5.6  | 存在しない紐付け       | `findByNoteIdAndTagId` | null を返す                |
| 5.7  | ノートのタグ一覧       | `findByNoteId`         | ノートに紐づく全タグ       |
| 5.8  | タグなし               | `findByNoteId`         | 空配列を返す               |
| 5.9  | タグのノート一覧       | `findByTagId`          | タグに紐づく全ノート       |
| 5.10 | 紐付け削除             | `delete`               | 特定の紐付けを削除         |
| 5.11 | 存在しない削除         | `delete`               | エラーになる               |
| 5.12 | ノートの全紐付け削除   | `deleteByNoteId`       | ノートの全タグ紐付けを削除 |
| 5.13 | タグの全紐付け削除     | `deleteByTagId`        | タグの全ノート紐付けを削除 |
| 5.14 | ノートのタグ数カウント | `countByNoteId`        | ノートに紐づくタグ数       |
| 5.15 | タグなしカウント       | `countByNoteId`        | 0 を返す                   |
| 5.16 | タグのノート数カウント | `countByTagId`         | タグに紐づくノート数       |
| 5.17 | ノートなしカウント     | `countByTagId`         | 0 を返す                   |

### 6. Attachments Repository (`attachments.repository.test.ts`)

| #    | テストケース          | テスト内容       | 保証される動作                      |
| ---- | --------------------- | ---------------- | ----------------------------------- |
| 6.1  | 添付ファイル作成      | `create`         | 添付ファイルが作成される            |
| 6.2  | 異なる kind           | `create`         | image/file/link が設定可能          |
| 6.3  | position 重複         | `create`         | 同ノート・同 position はエラー      |
| 6.4  | 異ノート同 position   | `create`         | 別ノートなら同 position 可能        |
| 6.5  | ID で取得             | `findById`       | 指定 ID を返す                      |
| 6.6  | note include          | `findById`       | ノート含めて取得                    |
| 6.7  | owner include         | `findById`       | オーナー含めて取得                  |
| 6.8  | 存在しない            | `findById`       | null を返す                         |
| 6.9  | 一覧取得              | `findMany`       | noteId でフィルタ                   |
| 6.10 | position ソート       | `findMany`       | position でソート（デフォルト asc） |
| 6.11 | createdAt ソート      | `findMany`       | createdAt でソート                  |
| 6.12 | ページング            | `findMany`       | take/skip で制限                    |
| 6.13 | 最大 position 取得    | `getMaxPosition` | ノート内の最大 position             |
| 6.14 | 添付なし最大 position | `getMaxPosition` | null を返す                         |
| 6.15 | 更新                  | `updateById`     | 情報を更新                          |
| 6.16 | position 更新         | `updateById`     | position を変更                     |
| 6.17 | 存在しない更新        | `updateById`     | エラーになる                        |
| 6.18 | 削除                  | `deleteById`     | 添付ファイルを削除                  |
| 6.19 | 存在しない削除        | `deleteById`     | エラーになる                        |
| 6.20 | ノートの全添付削除    | `deleteByNoteId` | ノートの全添付ファイルを削除        |
| 6.21 | カウント              | `count`          | 件数を取得                          |
| 6.22 | noteId カウント       | `count`          | noteId で絞込                       |
| 6.23 | ownerId カウント      | `count`          | ownerId で絞込                      |
| 6.24 | kind カウント         | `count`          | kind で絞込                         |

### 7. Tasks Repository (`tasks.repository.test.ts`)

| #    | テストケース     | テスト内容       | 保証される動作               |
| ---- | ---------------- | ---------------- | ---------------------------- |
| 7.1  | タスク作成       | `create`         | タスクが作成される           |
| 7.2  | completedAt 設定 | `create`         | 完了日時を設定して作成       |
| 7.3  | 1 対 1 制約      | `create`         | 同ノートに重複タスクはエラー |
| 7.4  | ID で取得        | `findById`       | 指定 ID を返す               |
| 7.5  | note include     | `findById`       | ノート含めて取得             |
| 7.6  | 存在しない       | `findById`       | null を返す                  |
| 7.7  | ノート ID で取得 | `findByNoteId`   | ノートに紐づくタスク         |
| 7.8  | タスクなし       | `findByNoteId`   | null を返す                  |
| 7.9  | 一覧取得         | `findMany`       | 全タスクを取得               |
| 7.10 | priority ソート  | `findMany`       | priority でソート            |
| 7.11 | dueAt ソート     | `findMany`       | dueAt でソート               |
| 7.12 | 完了状態フィルタ | `findMany`       | completedAt で絞込           |
| 7.13 | ページング       | `findMany`       | take/skip で制限             |
| 7.14 | 更新             | `updateById`     | 情報を更新                   |
| 7.15 | 完了状態設定     | `updateById`     | completedAt を設定           |
| 7.16 | 存在しない更新   | `updateById`     | エラーになる                 |
| 7.17 | ノート ID で更新 | `updateByNoteId` | ノート経由で更新             |
| 7.18 | タスクなし更新   | `updateByNoteId` | エラーになる                 |
| 7.19 | 削除             | `deleteById`     | タスクを削除                 |
| 7.20 | 存在しない削除   | `deleteById`     | エラーになる                 |
| 7.21 | ノート ID で削除 | `deleteByNoteId` | ノート経由で削除             |
| 7.22 | タスクなし削除   | `deleteByNoteId` | エラーになる                 |
| 7.23 | カウント         | `count`          | 件数を取得                   |
| 7.24 | 完了状態カウント | `count`          | completedAt で絞込           |
| 7.25 | 優先度カウント   | `count`          | priority で絞込              |

**Repository テストで保証される品質:**

- ✅ 全 CRUD 操作が正しくデータベースに反映される
- ✅ ユニーク制約・外部キー制約が正しく機能する
- ✅ include オプションで関連データが正しく取得される
- ✅ where 条件・ソート・ページングが正しく動作する
- ✅ 存在しないレコードへの操作は適切にエラーになる

---
