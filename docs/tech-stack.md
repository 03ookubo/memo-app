# 使用技術一覧（メモベース Todo アプリ）

この文書は、これまでの議論で合意した技術スタックと補助ツールを一覧化し、開発時に参照できるようにまとめたものです。

---

## バックエンド（実装済み ✅）

### コアフレームワーク
- **Next.js 15** (App Router, TypeScript, Turbopack)
- **React 19** / React Server Components
- **Vitest** - テストフレームワーク（345件のテスト実装済み）

### データ層
- **Prisma ORM** - データベースアクセス
- **PostgreSQL** (Supabase マネージド)
- Repository / Service パターンによる層分離

### 認証・セキュリティ
- **NextAuth.js v5** (Auth.js) + WebAuthn（パスキー認証）
- **@simplewebauthn/server, @simplewebauthn/browser**
- JWT セッション（30日有効）
- リンクコード（6桁、デバイス追加用）

### ストレージ
- **Supabase Storage** - 添付ファイル保存
- **@supabase/supabase-js** - Storage API クライアント

---

## フロントエンド（これから実装）

### UIコンポーネント
| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| **shadcn/ui** | latest | UIコンポーネント基盤 |
| **Tailwind CSS** | 3.x | スタイリング（導入済み） |
| **Lucide React** | latest | アイコン |
| **Radix UI** | - | shadcn/ui の基盤（自動導入） |

### 状態管理・データ取得
| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| **@tanstack/react-query** | ^5.x | サーバー状態管理、API連携 |
| **zustand** | ^5.x | クライアント状態（レイアウト等） |
| **React Hook Form** | ^7.x | フォーム管理 |
| **Zod** | ^3.x | バリデーション（バックエンドと共有） |

### インタラクション・アニメーション
| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| **@dnd-kit/core** | ^6.x | ドラッグ&ドロップ |
| **@dnd-kit/sortable** | ^8.x | ソート可能リスト |
| **framer-motion** | ^11.x | アニメーション |
| **@use-gesture/react** | ^10.x | タッチジェスチャー |

### レイアウト・エディタ
| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| **react-grid-layout** | ^1.x | パズル型グリッドレイアウト |
| **@tiptap/react** | ^2.x | リッチテキストエディタ |
| **@tiptap/starter-kit** | ^2.x | 基本拡張セット |
| **@tiptap/extension-placeholder** | ^2.x | プレースホルダー |

### ユーティリティ
| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| **date-fns** | ^3.x | 日付操作 |
| **clsx** | ^2.x | クラス名結合 |
| **tailwind-merge** | ^2.x | Tailwind クラスマージ |

---

## 環境変数

```bash
# Database (Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="xxx"

# NextAuth
NEXTAUTH_SECRET="xxx"
NEXTAUTH_URL="http://localhost:3000"

# WebAuthn
WEBAUTHN_RP_ID="localhost"
WEBAUTHN_RP_NAME="Memo App"
WEBAUTHN_ORIGIN="http://localhost:3000"
```

---

## デプロイ・ホスティング

- **Vercel** - Next.js ホスティング
- **Supabase** - データベース・ストレージ
- **GitHub** - ソースコード管理

---

## 開発ツール

- **ESLint** - コード品質
- **Prettier** - コードフォーマット
- **TypeScript** - 型安全性
- **Vitest** - テスト
- **Prisma Studio** - DB管理GUI
