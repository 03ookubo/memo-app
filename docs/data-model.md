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
- **Note**: メモ主体。タスク（Todo）として扱う場合は `Task` サブタイプが存在し、期日や優先度などのタスク固有属性は `Task` 側に保持します。タグ、添付、プロジェクト、親子構造を持つ。
- **Tag**: 提案候補（`isPreset`, `suggestionWeight`）や色を持ち、ノートと多対多で結び付く。
- **Attachment**: ノートに紐づく画像／ファイルなど。`position` によりノート内で並べ替え可能。
- **Project**: 必要に応じてノートを束ねるグループ。後から追加・拡張できるよう User と Note の間に配置。

## 2. 関係スキーマ（論理モデル）

### `User` テーブル

- **主キー**: `id`
  - `createdAt` / `updatedAt` … 監査用タイムスタンプ

* **補足**: 全てのリソースが `ownerId` で `User.id` を参照します。現状は単一ユーザー運用ですが、将来の複数ユーザー化に備えています。User モデルは現状最小化しており、`id` と `createdAt` のみ保持します（`updatedAt` や `email/displayName` は現段階では不要と判断）。

### `Note` テーブル

- **主キー**: `id`
- **主な列**
  - `ownerId` … ノート所有者（`User.id`）
  - `projectId` … 所属プロジェクト（任意、`Project.id`）
  - `parentId` … 親ノート（任意、自己参照）
  - `title` … タイトル（任意。メモ中心運用では未入力も可）
  - `bodyMarkdown` … ノート本文（Markdown 形式）。クライアント側でライブラリ（react-markdown 等）を使用してレンダリング
  - `bodyHtml` … （将来拡張用）HTML キャッシュ。**現在は使用しない（NULL 運用）**。クライアント側で Markdown をリアルタイム変換するため不要。将来的に SSR/SEO 対応やリッチエディタ機能が必要になった場合に活用
  - `Task` モデル … Todo として扱う場合は `Note.task` に 1:1 で Task が紐づき、`dueAt` / `priority` / `completedAt` / `recurrenceRule` などタスク固有属性を保持します。
  - `Event` モデル … カレンダーイベントとして扱う場合は `Note.event` に 1:1 で Event が紐づき、`startAt` / `endAt` / `location` / `recurrenceRule` などを保持します。
  - `archivedAt` / `deletedAt` … アーカイブ・ソフト削除管理
  - `metadata` … 将来拡張用の柔軟な JSON
  - `isEncrypted` … クライアントサイド暗号化されたノートかどうかのフラグ
  - `sortIndex` … 一覧やノート内での並び順を維持する整数
  - `createdAt` / `updatedAt`
- **補足**: `ownerId`, `archivedAt`, `projectId` にインデックスを設定し、絞り込み性能を確保しています。タスク固有の `dueAt` に対する検索は `Task` 側のインデックスを使用します。タグ（`NoteTag`）や添付（`Attachment`）とも関連します。

### データライフサイクルと削除ポリシー（重要）

- `Note` は `deletedAt`（ソフト削除）を持ち、ゴミ箱（復元可能）として扱います。UI 上で「復元」や「完全削除」をサポートする場合は、この `deletedAt` を参照して運用します。
- `Task`、`Event`、`Attachment`、`Tag` は `deletedAt` を持たず、**Note に紐づく子リソースは Note の物理削除時にアプリケーションロジックで削除**します。つまり、Note をソフト削除しても Task/Event は自動的には消えません（ユーザーの選択に応じて削除する）。
- 親ノート（`parentId`）削除時は `onDelete: SetNull` を採用します。これにより、子ノートは独立化されます。ユーザーに「関連リソースも全て削除するか、子ノートを残すか」を確認して処理を行います。

### Note ↔ Task / Event の扱い

- Note の物理削除、またはアプリケーションの明示的な操作（ユーザーが関連リソースの削除を選択）で `Task` / `Event` を削除します。`Task.deletedAt` / `Event.deletedAt` は持ちません。
- 実装に際しては、物理削除時に `Attachment` / `NoteTag` も自動的に削除されるよう `onDelete: Cascade` を付与することを推奨します（ただし、ソフト削除はアプリ側で制御します）。

### `Project` テーブル

- `name` … プロジェクト名（ユーザー内で一意）

### スキーマについての注意

- `NoteToTask` の relation 名は `schema.prisma` に明示してあります。Prisma Client を再生成後、`task` を `include` して取得することができます。
- `Note.parentId` に `@@index([parentId])` を追加することで、子ノート検索が高速になります（推奨）。
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
  - `createdAt` / `updatedAt`（`deletedAt` は持たない。タグの削除は物理削除で行う）
- **補足**: `scope=SYSTEM` のタグは共通ライブラリとして事前に登録し、`scope=USER` のタグはユーザー固有に作成します。`@@unique([scope, ownerId, name])` / `@@unique([scope, ownerId, color])` で重複を防ぎ、`NoteTag` を介してノートと多対多で結び付きます。

### Tag の一意性と運用

- DB レベルで `scope` と `name` の一意性を `@@unique([scope, ownerId, name])` で担保していますが、Postgres の NULL 扱い（SYSTEM タグの ownerId が NULL）により、完全に DB で担保できないケースがあるため、**SYSTEM タグの name/color の一意性はアプリケーション層でのバリデーションで保証**します。

### `NoteTag` テーブル

- **主キー**: `@@id([noteId, tagId])`（複合主キー）
- **主な列**
  - `noteId` … ノート ID（`Note.id`）
  - `tagId` … タグ ID（`Tag.id`）
  - `createdAt` … 割り当て日時
- **補足**: 複合主キーにより重複割り当てを防止し、`@@index([tagId])` を付与してタグからノートを引きやすくしています。

### `Attachment` テーブル

- **主キー**: `id`
- **主な列**
  - `ownerId` … 添付所有者（`User.id`）
  - `noteId` … ひもづくノート（`Note.id`）
  - `position` … ノート内での表示順（同一ノート内で一意）
  - `url` / `storagePath` … Supabase Storage 等に保管された実体への参照
  - `name` / `size` / `mimeType` … メタデータ（任意）
  - `kind` … 添付種別（画像・ファイル・リンク・その他）
  - `metadata` … レイアウト情報や EXIF などを保存する JSON（任意）
  - `createdAt` / `updatedAt`
- **補足**: `@@unique([noteId, position])` で並び替えを担保し、`@@index([ownerId])` で所有者単位のクエリ性能を確保します。

### `Event` テーブル

- **主キー**: `id`
- **主な列**
  - `noteId` … 紐づくノート（`Note.id`）
  - `startAt` / `endAt` … 開始・終了日時
  - `isAllDay` … 終日イベントフラグ
  - `location` … 場所
  - `recurrenceRule` … 繰り返しルール（iCal RRULE 形式）
  - `createdAt` / `updatedAt`
- **補足**: `Note` と 1:1 で紐づき、カレンダー表示やスケジュール管理に使用します。

### `Integration` テーブル

- **主キー**: `id`
- **主な列**
  - `userId` … 所有者
  - `provider` … 連携プロバイダ（"google_calendar", "notion" 等）
  - `accessToken` / `refreshToken` … 連携用トークン（アプリ層で暗号化推奨）
  - `expiresAt` … トークン有効期限
  - `metadata` … その他設定情報
  - `createdAt` / `updatedAt`
- **補足**: 外部カレンダー同期や他サービス連携のための認証情報を管理します。

### Attachment.metadata のレイアウト仕様

添付ファイルのノート内配置（位置・サイズ）を `metadata.layout` に格納します：

```typescript
interface AttachmentLayout {
  insertAfterLine?: number; // 本文内の挿入位置（行番号、0-indexed）
  width?: string; // "50%", "300px", "full"
  height?: string; // "auto", "200px"
  align?: "left" | "center" | "right";
  caption?: string; // キャプション
  alt?: string; // 代替テキスト（アクセシビリティ）
}
```

- **insertAfterLine**: 指定行の後に画像を表示。省略時は添付一覧の `position` 順で末尾に表示。
- **width/height**: CSS 互換の値。UI でリサイズ時に更新。
- **align**: 左寄せ/中央/右寄せ。

### 添付の取り扱い

- `Attachment` の削除は `Note` の物理削除、またはアプリケーションでの明示的削除時に実行します。
- **Storage 連携**: `src/server/storage/storage.service.ts` で Supabase Storage との連携を実装済み。
  - `uploadFile()`: ファイルアップロード → 公開 URL 取得
  - `deleteFile()` / `deleteFiles()`: ファイル削除（単体/一括）
  - `getPublicUrl()` / `getSignedUrl()`: URL 取得（公開/署名付き）
- **Attachment Service の Storage 連携関数**:
  - `uploadAndCreateAttachment()`: アップロード + DB レコード作成（原子的処理）
  - `deleteAttachmentWithStorage()`: Storage + DB 両方から削除
  - `deleteAllAttachmentsWithStorageForNote()`: ノートの全添付を一括削除
- ストレージのバケット名はデフォルト `attachments`。retention policy やバケット設定は Supabase コンソールで管理。

### `AttachmentKind` 列挙型

- `IMAGE` / `FILE` / `LINK` … 添付の表示や処理ロジックを分岐させるための区分値。

## 3. Prisma スキーマとの対応関係

- 上記テーブル／属性は `prisma/schema.prisma` にそのまま反映済みです。
- 追加のインデックス
  - `Note`: `@@index([ownerId, archivedAt])`, `@@index([projectId])` (タスクの期限は `Task` 側の `dueAt` インデックスを利用)
  - `NoteTag`: `@@index([tagId])`
  - `Attachment`: `@@index([ownerId])`
- 添付の `position` 一意制約により、ノート内でドラッグ＆ドロップした順序を安全に保持できます。

## 4. 今後の拡張の下地

- **パスワード管理機能**: 新たに `VaultItem` や暗号化用フィールドを追加する場合は、`ownerId` でユーザーと紐付け、`metadata`（JSON）や別テーブルを活用。
- **タグ自動提案**: `suggestionWeight` を更新、またはスコア履歴用テーブルを追加するだけで対応する設計。
- **全文検索**: `Note` に `@@index` を追加するか、Materialized View を作成する形で段階的に導入可能。

## 8. 認証（Auth）方針の概要

- 認証の主な方式は Passkey (WebAuthn)、マジックリンク、共有トークン（share tokens）を用いる設計です。パスワードは保持しません。
- 初回認証または共有時は Magic Link / Share Token を発行してアクセス権を付与し、以後は Passkey での認証を推奨します。
- Passkey のための公開鍵（publicKey）は `Authenticator` テーブルに保存し、秘密鍵は決して保存しません。詳細は `docs/authentication.md` を参照してください。

## 5. 設計上の決定と理由（Summary & Rationale）

- **Task.ownerId を持たせない選択**: 1 ユーザーあたりのタスクが少数（想定 100 件程度）であれば、`Task` 側に `ownerId` を冗長に持たせなくても、`Note` を経由して `ownerId` を JOIN すれば十分に高速です。冗長化によるデータ不整合と運用コストを避けるため、`Task.ownerId` は設けていません。

- **削除ポリシー**: `Note` はソフト削除（`deletedAt`）でゴミ箱運用。`Task` / `Attachment` / `NoteTag` は `deletedAt` を持たない（物理削除またはアプリで制御）。親ノート削除時は `parentId` を `NULL` にセットして子を独立させる（`onDelete: SetNull`）。これは UI 側でユーザーに削除方針を確認するためです。

- **Tag の一意性**: `SYSTEM` タグと `USER` タグの一意性を DB のユニーク制約だけで完全に担保するのは難しいため、アプリケーション側で `SYSTEM` タグ名 / color の重複を防ぐバリデーションを実装します。

- **Note ↔ Task の relation 名明示**: `NoteToTask` の relation を明示することで、スキーマの可読性・生成型の安定性を向上させています。

## 6. 削除操作: アプリケーションの実装方針（API/UX）

1. **Note の削除（UI）**

- ユーザーに対して「関連タスク、添付、タグの紐付け、子ノートはどうするか？」の選択肢を提示します。
- 選択肢：「関連リソースを全て削除」／「関連リソースは削除するが子ノートは独立化」／「キャンセル」

2. **アプリ側の実装**

- 削除時の操作はトランザクションで行う（可能であれば）、もしくは順序を明示した操作で分割して実行。
- 物理削除が発生する場合は、関連する Attachment のストレージファイルも同時に削除（Signed URL・Retention Policy を考慮）。

3. **API 例**

- `DELETE /api/notes/:id` で soft-delete（`deletedAt` = now） を行い、`task` と `attachments` を残す（ユーザーの選択に命じる）。
- `DELETE /api/notes/:id?force=true` で物理削除を行い、関連する Task/NoteTag/Attachment を全て削除（ストレージ削除も呼ぶ）を行う。

## 7. テストと運用

- マイグレーションを含む変更は必ずステージング環境でテスト。データ移行スクリプトはコードレビューを行い、影響範囲の確認を必須化します。
- 削除に関する UI/UX のテストは特に重要（誤削除リスク、復元フローの確認、ストレージか空き容量影響）。

この資料と `docs/architecture.md` を併用しながら、マイグレーションや API 設計を進めてください。
