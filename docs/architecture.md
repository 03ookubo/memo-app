# アーキテクチャ設計ガイド

この文書は「メモを中心に必要に応じて Todo として扱う」アプリを疎結合かつ再利用可能な形で拡張していくための設計指針です。Next.js（App Router）と TypeScript を前提にし、将来の機能追加・変更に強い構成を示します。基本構成は Next.js 公式ドキュメントのプロジェクト構造ガイド（<https://nextjs.org/docs/app/getting-started/project-structure>）を踏襲し、本プロジェクト特有のレイヤやフォルダを追加したものです。

## 設計方針

- **メモ主体のドメイン**: ノート（メモ）を第一級とし、Todo は付随機能として扱う。タグ・添付・プロジェクト等はすべてノートに紐づく。
- **疎結合 / 層構造**: UI（App Router）・ドメインサービス（server 層）・データアクセス（Prisma）を分離し、各層が明確な責務を持つ。
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
      auth/[...nextauth]/route.ts     # NextAuth Credentials Provider 設定
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
    notes/
      note.service.ts                  # ビジネスロジック（検証・トランザクション）
      note.repository.ts               # Prisma 呼び出し
    tags/
      tag.service.ts
      tag.repository.ts
    attachments/
      attachment.service.ts
      attachment.repository.ts
    search/
      search.service.ts                # 検索ロジック（Tier1: LIKE, Tier3: tsvector）
  lib/
    prisma.ts                          # Prisma Client シングルトン
    markdown/
      render-note.ts                   # Markdown → HTML 変換（サニタイズ）
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

| レイヤ                   | 役割                                                                              | 主な配置                                              |
| ------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Presentation (UI)        | 画面構成、フォーム、イベント発火。App Router の Server/Client Components を含む。 | `src/app/**`, `src/features/**/components`            |
| Application / Service    | 認証チェック、ユースケース、トランザクション、入力検証。                          | `src/server/**/ *.service.ts`                         |
| Data Access (Repository) | Prisma のクエリ、スキーマに対する CRUD。                                          | `src/server/**/ *.repository.ts`, `src/lib/prisma.ts` |
| Domain Types             | DTO・入力/出力型・業務ルール。                                                    | `src/features/**/types.ts`, `src/types/**`            |
| Shared Utilities         | Markdown レンダリング、バリデーション、日付変換等。                               | `src/lib`, `src/utils`, `src/ui`                      |

## リクエストライフサイクル例

1. ユーザーが `/notes` を開く → `app/(dashboard)/notes/page.tsx`（Server Component）が `noteService.listNotes()` を呼び出す。
2. `noteService` は `session.ts` 経由で認証ユーザーを取得し、権限チェック後に `noteRepository.findMany()` を実行。
3. `noteRepository` が Prisma でデータを取得 → 必要なら Markdown を HTML に変換 → DTO を返却。
4. Server Component が結果を UI コンポーネントへ渡して SSR レンダリング。
5. クライアント側でフィルタ条件を変更した場合、SWR が `/api/notes?tag=...` を呼び出し、同じ `noteService` ロジックを再利用。

## 拡張ポイント

- **タグ UI**: `features/tags/**` でタグ候補やグループ表示を管理。Tier2 以降の自動タグ付けは `tag.service.ts` に ML/ルールロジックを追加しても UI には影響しない。
- **添付ファイルの並び替え**: `attachments` のサービスで順序更新ロジックを実装し、API とクライアントの双方から呼び出す。
- **パスワード保管機能**: 新たに `features/vault/` と `server/vault/` を追加し、暗号化ロジックは `lib/crypto/` に集約。既存の認証・セッションを流用し、UI はダッシュボード配下にページ追加。
- **検索強化**: `server/search/search.service.ts` を初期は LIKE ベースで実装し、Tier3 で tsvector 版へ差し替える。UI 層の変更は最小限に抑えられる。

## テスト方針

- サービス層は Jest（または Vitest）でユニットテストを用意し、 Prisma をモック化 or Test DB を利用。
- App Router の API ルートは Next.js 提供の `app-router-handler` テストユーティリティや Supertest を使って統合テストを実施。
- コンポーネントは React Testing Library でユーザー操作ベースのテストを書く。

## ドキュメント連携

- 技術選定: `docs/tech-stack.md`
- 拡張性ルール: `docs/development-guidelines.md`
- Tier・要件: `docs/feature-tiers.md`
- データモデル: `docs/data-model.md`

新機能を検討する際は、これら既存ドキュメントに追記し、アーキテクチャ変更が必要であれば本ガイドを更新してください。
