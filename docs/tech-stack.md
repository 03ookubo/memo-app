# 使用技術一覧（メモベース Todo アプリ）

この文書は、これまでの議論で合意した技術スタックと補助ツールを一覧化し、開発時に参照できるようにまとめたものです。

## コアアプリケーション

- Next.js (App Router, TypeScript, Turbopack 開発サーバ)
- React / React Server Components（App Router 標準構成）
- Tailwind CSS（UI スタイリング）
- SWR（クライアント側のフェッチとキャッシュに利用予定）
- react-markdown（クライアント側での Markdown レンダリング。サーバー側での HTML キャッシュは行わない方針）

## データ層

- Prisma ORM
- Postgres（Supabase マネージド Postgres を想定）
- Prisma Client（`node_modules/@prisma/client` に生成、デフォルト設定）
- Prisma Studio（データ確認ツール／必要に応じて利用）

## 認証・セキュリティ

- NextAuth.js v5 (Auth.js) + WebAuthn（パスキー認証）
  - 認証方式: パスキー（指紋/顔認証、パスワード不要）
  - セッション戦略: JWT（30 日有効、DB セッションテーブル不要）
  - デバイス追加: リンクコード（6 桁、有効期限 5 分）
- @simplewebauthn/server, @simplewebauthn/browser（WebAuthn 実装）
- 環境変数管理: `.env`（ローカル開発用）＋ Vercel / Supabase 環境変数
  - `DATABASE_URL` … Prisma 接続用
  - `DIRECT_URL` … Prisma マイグレーション用（Connection Pooling 経由でない直接接続）
  - `NEXT_PUBLIC_SUPABASE_URL` … Supabase プロジェクト URL
  - `SUPABASE_SERVICE_ROLE_KEY` … Storage API 用サービスロールキー
  - `NEXTAUTH_SECRET` … JWT トークン署名用シークレット
  - `NEXTAUTH_URL` … 認証コールバック URL（本番環境用）
  - `WEBAUTHN_RP_ID` … WebAuthn Relying Party ID（ドメイン）
  - `WEBAUTHN_RP_NAME` … WebAuthn Relying Party 名
  - `WEBAUTHN_ORIGIN` … WebAuthn オリジン URL

## ストレージ・添付ファイル

- Supabase Storage（添付ファイルの保存先）
- `@supabase/supabase-js`（Storage API クライアント）
- メタデータ管理は Prisma の `Attachment` モデルで実施
- レイアウト情報（位置・サイズ・配置）は `Attachment.metadata` に JSON で格納

## 開発体験・ツールチェーン

- Node.js / npm（create-next-app で初期化済み）
- ESLint / Prettier（Next.js デフォルト設定を利用）
- dotenv（ローカル開発時に環境変数を読み込む）
- GitHub（ソースコードホスティング、PR レビュー）

## デプロイ・ホスティング

- Vercel（Next.js ホスティング、環境変数設定）
- Supabase（データベース・ストレージ）

## 補足メモ

- パスワード管理機能は将来要件（セキュリティ基準を満たしたタイミングで検討）。
- タグ自動提案や自動タグ付けは Tier2 以降の予定機能。
- クリップボード取り込み、添付ドラッグ配置などの UI 改善機能は段階的に導入予定。
- AI（本アシスタント）はドキュメント/設計支援に限定し、物理的な操作は人間が行う（詳細は `.github/copilot-instruction.md` を参照）。
