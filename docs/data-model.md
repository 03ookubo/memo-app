# データモデルまとめ

この文書は最新の要件に基づいて再構築した Prisma スキーマの概念データモデル（Conceptual Data Model）と関係スキーマ（Relational Schema）を整理したものです。

## 1. 概念データモデル（CDM）

```
User 1 ────────< Note >───────< Tag
  │                │             \
  │                │              `─ suggestionWeight / isPreset で候補提示を制御
  │                │
  │                └────< Attachment
  │                            （位置情報を持ち、ノート内で画像などを並べ替え）
  │
  └────< Project ───────< Note

Note ── self reference ──< Note
  （親子関係でサブノート／サブタスクを構成）
```

- **User**: アプリ全体の所有者（現状はあなた一人）だが、将来の複数ユーザー対応に備え、各リソースは `ownerId` を保持。
- **Note**: メモ主体。Todo として扱うかどうかは `isTask` や期日／優先度等で表現。タグ、添付、プロジェクト、親子構造を持つ。
- **Tag**: 提案候補（`isPreset`, `suggestionWeight`）や色を持ち、ノートと多対多で結び付く。
- **Attachment**: ノートに紐づく画像／ファイルなど。`position` によりノート内で並べ替え可能。
- **Project**: 必要に応じてノートを束ねるグループ。後から追加・拡張できるよう User と Note の間に配置。

## 2. 関係スキーマ（論理モデル）

### `User` テーブル

- **主キー**: `id`
  - `createdAt` / `updatedAt` … 監査用タイムスタンプ
- **補足**: 全てのリソースが `ownerId` で `User.id` を参照します。現状は単一ユーザー運用ですが、将来の複数ユーザー化に備えています。

### `Note` テーブル

- **主キー**: `id`
- **主な列**
  - `ownerId` … ノート所有者（`User.id`）
  - `projectId` … 所属プロジェクト（任意、`Project.id`）
  - `parentId` … 親ノート（任意、自己参照）
  - `title` … タイトル（任意。メモ中心運用では未入力も可）
  - `bodyMarkdown` / `bodyHtml` … ノート本文の Markdown とサニタイズ済み HTML キャッシュ
  - `isTask` … Todo として扱うかどうかのフラグ
  - `completedAt` / `dueAt` / `remindAt` / `priority` … Todo 扱い時の各種属性（すべて任意）
  - `archivedAt` / `deletedAt` … アーカイブ・ソフト削除管理
  - `metadata` … 将来拡張用の柔軟な JSON
  - `sortIndex` … 一覧やノート内での並び順を維持する整数
  - `createdAt` / `updatedAt`
- **補足**: `ownerId`, `dueAt`, `archivedAt`, `projectId` にインデックスを設定し、絞り込み性能を確保しています。タグ（`NoteTag`）や添付（`Attachment`）とも関連します。

### `Project` テーブル

- **主キー**: `id`
- **主な列**
  - `ownerId` … プロジェクト所有者（`User.id`）
  - `name` … プロジェクト名（ユーザー内で一意）
  - `description` / `emoji` … UI 表示用メタ情報（任意）
  - `sortIndex` … プロジェクト一覧の表示順
  - `archivedAt` … アーカイブ管理（非表示切替）
  - `deletedAt` … ソフト削除管理（ゴミ箱運用用）
  - `createdAt` / `updatedAt`
- **補足**: `@@unique([ownerId, name])` により、同一ユーザー内で名前重複を防止します。

### `Tag` テーブル

- **主キー**: `id`
- **主な列**
  - `scope` … `SYSTEM`（全ユーザー共通） / `USER`（個別）
  - `ownerId` … `USER` スコープのときの所有者（`User.id`）
  - `name` … タグ名（スコープ＋所有者単位で一意）
  - `description` … メモ表示・候補提示用メモ（必須）
  - `color` … UI 表示色（必須、スコープ＋所有者単位で一意）
  - `isPreset` … 初期提供タグかどうか（`SYSTEM` のとき通常 `true`）
  - `createdAt` / `updatedAt` / `deletedAt`
- **補足**: `scope=SYSTEM` のタグは共通ライブラリとして事前に登録し、`scope=USER` のタグはユーザー固有に作成します。`@@unique([scope, ownerId, name])` / `@@unique([scope, ownerId, color])` で重複を防ぎ、`NoteTag` を介してノートと多対多で結び付きます。

### `NoteTag` テーブル

- **主キー**: `id`
- **主な列**
  - `noteId` … ノート ID（`Note.id`）
  - `tagId` … タグ ID（`Tag.id`）
  - `createdAt` … 割り当て日時
- **補足**: `@@unique([noteId, tagId])` で重複割り当てを防止し、`@@index([tagId])` を付与してタグからノートを引きやすくしています。

### `Attachment` テーブル

- **主キー**: `id`
- **主な列**
  - `ownerId` … 添付所有者（`User.id`）
  - `noteId` … ひもづくノート（`Note.id`）
  - `position` … ノート内での表示順（同一ノート内で一意）
  - `url` / `storagePath` … Supabase Storage 等に保管された実体への参照
  - `name` / `size` / `mimeType` … メタデータ（任意）
  - `kind` … 添付種別（画像・ファイル・リンク・その他）
  - `metadata` … EXIF など拡張情報を保存する JSON（任意）
  - `createdAt` / `updatedAt`
- **補足**: `@@unique([noteId, position])` で並び替えを担保し、`@@index([ownerId])` で所有者単位のクエリ性能を確保します。

### `AttachmentKind` 列挙型

- `IMAGE` / `FILE` / `LINK` … 添付の表示や処理ロジックを分岐させるための区分値。

## 3. Prisma スキーマとの対応関係

- 上記テーブル／属性は `prisma/schema.prisma` にそのまま反映済みです。
- 追加のインデックス
  - `Note`: `@@index([ownerId, archivedAt])`, `@@index([ownerId, dueAt])`, `@@index([projectId])`
  - `NoteTag`: `@@index([tagId])`
  - `Attachment`: `@@index([ownerId])`
- 添付の `position` 一意制約により、ノート内でドラッグ＆ドロップした順序を安全に保持できます。

## 4. 今後の拡張の下地

- **パスワード管理機能**: 新たに `VaultItem` や暗号化用フィールドを追加する場合は、`ownerId` でユーザーと紐付け、`metadata`（JSON）や別テーブルを活用。
- **タグ自動提案**: `suggestionWeight` を更新、またはスコア履歴用テーブルを追加するだけで対応する設計。
- **全文検索**: `Note` に `@@index` を追加するか、Materialized View を作成する形で段階的に導入可能。

この資料と `docs/architecture.md` を併用しながら、マイグレーションや API 設計を進めてください。
