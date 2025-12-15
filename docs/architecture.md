# アーキテクチャ設計ガイド

この文書は「メモを中心に必要に応じて Todo として扱う」アプリを疎結合かつ再利用可能な形で拡張していくための設計指針です。Next.js（App Router）と TypeScript を前提にし、将来の機能追加・変更に強い構成を示します。基本構成は Next.js 公式ドキュメントのプロジェクト構造ガイド（<https://nextjs.org/docs/app/getting-started/project-structure>）を踏襲し、本プロジェクト特有のレイヤやフォルダを追加したものです。

## 設計方針

- **メモ主体のドメイン**: ノート（メモ）を第一級とし、Todo は付随機能として扱う。タグ・添付・プロジェクト等はすべてノートに紐づく。
- **疎結合 / 層構造**: UI（App Router）・ドメインサービス（server 層）・データアクセス（Prisma）を分離し、各層が明確な責務を持つ。
- **Repository / Service 層分割方針**: Repository 層は 1 ドメインにつき 1 ファイル（`src/server/repositories/<domain>.repository.ts`）でフラットに保持し、Service 層はドメインごとにフォルダを用意して複数のサービス（`.read/.write/.archive/.delete` 等）を分割して配置することで、肥大化を抑制し可読性を保ちます。
- **Feature ベース構成**: `features/<name>` 単位で UI / hooks / 型 / クライアントサイドロジックをまとめ、再利用性と変更容易性を高める。
- **サーバー側ロジックの集中**: Prisma 呼び出しは `src/server/**` のサービスやリポジトリ経由で行う。App Router の API ルートや Server Component はサービスを介してデータ取得する。
- **設定・共通処理の単一化**: Markdown レンダリング、認証、バリデーションなどの共通処理は `lib/` や `config/` に集約し、横断的な変更を一箇所で完結させる。
- **ドキュメント駆動**: 仕様変更や新機能追加時は、まずドキュメント（本資料 / `development-guidelines.md` / API 契約）を更新し、コードは後追いで実装する。
- **公式ガイドの順守**: フォルダ構成やビルド設定を変更する場合は常に Next.js 公式プロジェクト構造ガイドを確認し、本資料も同ガイドに合わせて最新化する。

## 推奨フォルダ構成

```
src/
  app/
    (auth)/sign-in/page.tsx            # サインイン画面（Client Component）
    (dashboard)/layout.tsx             # 認証後レイアウト
    (dashboard)/notes/page.tsx         # メインのノート一覧（Server Component）
    (dashboard)/notes/[id]/page.tsx    # ノート詳細編集ページ
    api/
      auth/[...nextauth]/route.ts     # NextAuth WebAuthn Provider 設定
      auth/webauthn/                   # WebAuthn 登録/認証 API
      auth/link-code/                  # デバイス追加用リンクコード API
      notes/route.ts                  # GET/POST (コレクション)
      notes/[id]/route.ts             # GET/PATCH/DELETE（詳細）
      tags/route.ts                   # タグ候補・作成 API
      attachments/reorder/route.ts    # 添付の並び替え API
  features/
    notes/
      components/                      # ノート関連 UI（一覧・カード等）
      hooks/                           # SWR や Client 用のカスタムフック
      utils/                           # クライアントサイドユーティリティ
      types.ts                         # 型定義（DTO）
    tags/
      components/
      hooks/
      types.ts
    attachments/
      components/
      hooks/
      utils/
    auth/
      hooks/                           # `useCurrentUser` など
      utils/
  server/
    auth/
      session.ts                       # `getCurrentUser` 等のヘルパ
    services/
      notes/
        note.read.service.ts           # 読み取り系ユースケース（一覧/取得/検索・表示）
        note.write.service.ts          # 作成/更新系ユースケース（タグ/添付/Task の Transaction をここで制御）
        note.archive.service.ts        # アーカイブ/アンアーカイブ等（ビジネスルール）
        note.delete.service.ts         # 削除（ソフトデリート/永続削除ロジック）
        # NOTE: ノート単体で完結する検索（title/body の LIKE やソートなど）は `services/notes/` 内の read service で扱う。
      tags/
        tag.service.ts
      attachments/
        attachment.service.ts
    auth/
      index.ts                         # 統一エクスポート
      auth.config.ts                   # NextAuth 設定（WebAuthn provider, callbacks）
      session.ts                       # getCurrentUser(), requireAuth() ヘルパー
      webauthn.ts                      # WebAuthn ヘルパー（登録/認証）
      link-code.ts                     # リンクコード生成/検証
    storage/
      storage.service.ts               # Supabase Storage 連携（アップロード/削除/URL取得）
    repositories/
      notes.repository.ts              # Prisma 呼び出し（生クエリ・DB CRUD） — 1 機能 = 1 ファイル（フラット）
      tags.repository.ts
      attachments.repository.ts
  lib/
    prisma.ts                          # Prisma Client シングルトン
    validation/
      zod-schemas.ts                   # API 入力検証スキーマ
    auth/
      constants.ts
  config/
    feature-flags.ts                   # Tier / 実験機能トグル
    nextauth.ts                        # NextAuth 共通設定（Cookie, maxAge 等）
  ui/
    components/                        # 共通 UI（ボタン、モーダル等）
    icons/
    theme.ts                           # Tailwind テーマ拡張
  utils/
    date.ts
    array.ts
  types/
    global.d.ts                        # 汎用型（ID, Timestamp 等）
```

> **補足**: App Router では `app/` 直下にサーバーコンポーネントを置きつつ、Client Component や hooks は `features/**` に配置します。`features` 内から `server` へ直接依存しないよう注意し、データ取得は API もしくは Server Component 経由で行います。

## レイヤごとの責務

| レイヤ                   | 役割                                                                              | 主な配置                                                       |
| ------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Presentation (UI)        | 画面構成、フォーム、イベント発火。App Router の Server/Client Components を含む。 | `src/app/**`, `src/features/**/components`                     |
| Application / Service    | 認証チェック、ユースケース、トランザクション、入力検証。                          | `src/server/<domain>/*.service.ts`                             |
| Data Access (Repository) | Prisma のクエリ、スキーマに対する CRUD。                                          | `src/server/repositories/*.repository.ts`, `src/lib/prisma.ts` |

### サービス層の設計補足

- サービスは「ドメイン（notes / tags / attachments / auth）」ごとに整理し、必要に応じて操作単位で分割する（例: `note.read.service.ts`, `note.write.service.ts`, `note.archive.service.ts`, `note.delete.service.ts`）。
- これにより、読み取り専用処理と更新処理を分離でき、テスト・権限チェック・パフォーマンス最適化がしやすくなります。
- ビジネスルールや権限チェック・バリデーション・トランザクション制御はサービスで行い、リポジトリは極力 CRUD に徹します。
- 複数テーブルや複数リポジトリをまたぐ操作はサービスで Prisma トランザクション（`$transaction`）を利用して原子性を保ちます。
- サービスは小さく保ちつつ、ユースケースごとの責務を明確にすることでコードの可読性を高めます。例えば、`note.write.service.ts` は Note 作成と Tag/Attachment/Task の作成をトランザクションでまとめます。

### 命名規約とファイル配置（推奨）

- ファイル名の命名: `domain.operation.service.ts` を基本形とする。
  - 例: `src/server/services/notes/note.read.service.ts`, `src/server/services/attachments/attachment.reorder.service.ts`。
- リポジトリ: `src/server/repositories/domain.repository.ts`（Prisma 呼び出しを 1 機能 = 1 ファイルで集約する。フォルダ分割は行わない）。
- クロスドメイン機能（Search, Migration, Orchestration）は `server/<cross-domain>/` に配置する。

### ドメイン間の依存ルール（疎結合の維持）

`Note` サービスが肥大化し「神クラス」になることを防ぐため、以下のルールを設けます。

1.  **責務の委譲**: `Note` サービスは `Task` や `Event` の詳細なビジネスロジック（例: 繰り返しルールの計算、外部カレンダーとの同期手順）を直接実装してはいけません。
    - 良い例: `Note` 作成時に `Task` データがあれば、`TaskService.createTask(tx, data)` を呼び出す。
    - 悪い例: `Note` サービス内で `recurrenceRule` を解析し、次のタスク日付を計算する。
2.  **メタデータの活用**: 外部サービス（Google Calendar等）固有のIDやステータスは、`Event` や `Task` モデルの `metadata` JSONフィールドに格納し、スキーマ定義を特定の外部サービスに依存させないようにします。
3.  **Integrationの分離**: 外部連携処理は `services/integrations/` 配下のサービスに集約し、ドメインサービス（`Note`, `Event`）からはインターフェース（または抽象化されたメソッド）を通じて利用します。

### トランザクションと境界線

- サービスがトランザクションの起点になり、必要に応じて複数のリポジトリ呼び出しを `prisma.$transaction()` でラップします。
- `repository` はトランザクションを受け取れるようにオプション引数を持つ関数にしておくと、テストや再利用が容易になります（例: `createNote(data, tx)`）。

### テストの考え方

- サービスはユニットテストでビジネスロジックとトランザクションの境界を検証します。Repository は Prisma をモックか Test DB を使い CRUD の動作を検証します。
- 重要なユースケース（Note 作成 -> Task 作成 -> Tag 更新 など）は統合テストで `prisma.$transaction` による整合性を確認します。

### 補足: 検索の役割

- 単体のノート検索（タイトルやボディの LIKE / ソートなど）は `notes/` の read service に実装することを推奨します。
- 各ドメイン（Projects, Tags, Tasks）も同様に、それぞれのサービスで `search` パラメータによる部分一致検索を提供します。
- **専用の Search Service は設けません**。複数ドメイン横断検索（Tier 3）が必要になった場合は、各サービスを呼び出すオーケストレーション層として実装を検討します。

| Domain Types | DTO・入力/出力型・業務ルール。 | `src/features/**/types.ts`, `src/types/**` |
| Shared Utilities | Markdown レンダリング、バリデーション、日付変換等。 | `src/lib`, `src/utils`, `src/ui` |

### 認証層の設計

認証は NextAuth.js v5 + WebAuthn（パスキー）を使用し、パスワード不要の生体認証を実装します。

詳細は `docs/auth-design.md` を参照してください。

#### 概要

| 項目         | MVP (Tier 1)         | 将来 (Tier 2+)   |
| ------------ | -------------------- | ---------------- |
| ユーザー数   | 1 人のみ             | 複数対応         |
| 認証方式     | パスキー（WebAuthn） | 同左             |
| デバイス追加 | リンクコード（6 桁） | QR コード + 承認 |
| セッション   | JWT 30 日            | 同左             |

#### ファイル構成

| ファイル                         | 役割                                                          |
| -------------------------------- | ------------------------------------------------------------- |
| `src/server/auth/auth.config.ts` | NextAuth 設定（WebAuthn provider, callbacks）                 |
| `src/server/auth/session.ts`     | サーバーサイドヘルパー（`getCurrentUser()`, `requireAuth()`） |
| `src/server/auth/webauthn.ts`    | WebAuthn ヘルパー（登録/認証）                                |
| `src/server/auth/link-code.ts`   | リンクコード生成/検証                                         |
| `src/server/auth/index.ts`       | 統一エクスポート                                              |

#### 認証フロー（MVP）

1. **初回アクセス**（User 未登録）: パスキー登録画面 → 生体認証 → User + Credential 作成
2. **2 回目以降**（User 登録済み）: サインイン画面 → 生体認証 → セッション発行
3. **デバイス追加**: 既存デバイスで 6 桁コード生成 → 新デバイスで入力 → パスキー登録

#### セキュリティ

- パスキーはフィッシング耐性あり（オリジン検証）
- 秘密鍵はデバイス内に保持（サーバーに送信されない）
- リンクコードは 5 分で失効、1 回限り
- `NEXTAUTH_SECRET` で JWT 署名

## リクエストライフサイクル例

1. ユーザーが `/notes` を開く → `app/(dashboard)/notes/page.tsx`（Server Component）が `noteService.listNotes()` を呼び出す。
2. `noteService` は `session.ts` 経由で認証ユーザーを取得し、権限チェック後に `src/server/repositories/notes.repository.ts` の `findMany()` を実行。
3. `notesRepository` が Prisma でデータを取得 → DTO を返却（Markdown→HTML 変換はクライアント側で react-markdown を使用）。
4. Server Component が結果を UI コンポーネントへ渡して SSR レンダリング。
5. クライアント側でフィルタ条件を変更した場合、SWR が `/api/notes?tag=...` を呼び出し、同じ `noteService` ロジックを再利用。

## 拡張ポイント

- **タグ UI**: `features/tags/**` でタグ候補やグループ表示を管理。Tier2 以降の自動タグ付けは `tag.service.ts` に ML/ルールロジックを追加しても UI には影響しない。
- **添付ファイルの並び替え**: `attachments` のサービスで順序更新ロジックを実装し、API とクライアントの双方から呼び出す。
- **パスワード保管機能**: 新たに `features/vault/` と `server/vault/` を追加し、暗号化ロジックは `lib/crypto/` に集約。既存の認証・セッションを流用し、UI はダッシュボード配下にページ追加。
- **検索強化**: 各サービスの `search` パラメータによる LIKE 検索で対応。Tier3 で高速全文検索（tsvector）が必要になった場合は、各サービスの内部実装を差し替えるか、オーケストレーション層を追加。
- **外部連携（Integrations）**: `server/services/integrations/` を新設し、Google Calendar や Notion との同期ロジックを実装。`Integration` モデルでトークンを管理し、`Event` モデルと外部イベントを同期させる。
- **AI/NLP 解析**: `server/services/nlp/` を新設し、ノート本文から日付やタスクを抽出するロジックを配置。OpenAI API 等を利用する場合はここでラップし、`Note` 作成時にフックして `Event` や `Task` を自動生成する。

## テスト方針

- サービス層は Jest（または Vitest）でユニットテストを用意し、 Prisma をモック化 or Test DB を利用。
- App Router の API ルートは Next.js 提供の `app-router-handler` テストユーティリティや Supertest を使って統合テストを実施。
- コンポーネントは React Testing Library でユーザー操作ベースのテストを書く。

## ドキュメント連携

- 技術選定: `docs/tech-stack.md`
- 拡張性ルール: `docs/development-guidelines.md`
- Tier・要件: `docs/feature-tiers.md`
- データモデル: `docs/data-model.md`
- 認証設計: `docs/auth-design.md`

新機能を検討する際は、これら既存ドキュメントに追記し、アーキテクチャ変更が必要であれば本ガイドを更新してください。

## 移行／リファクタリングチェックリスト（開発者向け）

- リポジトリを `src/server/repositories/` に移動し、1 ドメイン＝ 1 ファイルの命名ルールに従う（例: `notes.repository.ts`）。
- サービスは `src/server/services/<domain>/` フォルダ配下に配置し、`*.read.service.ts`, `*.write.service.ts` など操作単位で分割する。
- リポジトリを移動した場合はインポートパスを更新し、`src/server/repositories/index.ts` を作ると各サービスからの参照が簡単になる。
- 移行後に `npm run build` を実行して型エラーと未解決インポートを検出し、必要に応じて修正する。
- 重大なリファクタは別ブランチで行い、CI の lint / build / test を通した PR を提出する。
