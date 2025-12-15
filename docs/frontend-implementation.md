# フロントエンド実装ガイド

このドキュメントは、VSCode風UIの実装手順、必要なライブラリ、画面構成をまとめたものです。
**Next.js 15 App Router のベストプラクティス**に準拠した設計です。

> UI詳細設計は `ui-design.md` を参照
> アーキテクチャ全体は `architecture.md` を参照

---

## ⚠️ 設計上の重要な考慮事項

### Next.js App Router のベストプラクティス

| 原則 | 説明 |
|------|------|
| **Server Components デフォルト** | データ取得は Server Components で行う |
| **Client Components 最小化** | インタラクティブな部分のみ `'use client'` |
| **コンポーネント境界の明確化** | Server/Client の責務分離 |
| **Streaming と Suspense** | 段階的なUI表示でUX向上 |
| **Route Groups** | `(auth)`, `(workspace)` でレイアウト分離 |
| **Server Actions** | フォーム送信・データ更新に使用 |

### セキュリティ考慮事項（公開に必須）

| 項目 | 対応 |
|------|------|
| **認証チェック** | 全ての保護ページ/API/Server Actions で実施 |
| **CSRF対策** | Server Actions 使用時は自動対応 |
| **XSS対策** | ユーザー入力のサニタイズ、dangerouslySetInnerHTML 回避 |
| **Rate Limiting** | API へのリクエスト制限（将来実装） |
| **入力検証** | Zod による型安全なバリデーション |
| **環境変数** | NEXT_PUBLIC_ の使い分け徹底 |

### パフォーマンス考慮事項

| 項目 | 対応 |
|------|------|
| **キャッシュ戦略** | revalidate, unstable_cache の適切な設定 |
| **画像最適化** | next/image の使用 |
| **コード分割** | 動的インポート（Tiptap等の重いライブラリ） |
| **バンドルサイズ** | 必要なライブラリのみインポート |
| **Suspense境界** | 適切な粒度でローディング表示 |

---

## 📦 ライブラリインストール

### Step 1: shadcn/ui 初期化

```bash
npx shadcn@latest init
```

設定オプション:
- Style: Default
- Base color: Slate (VSCode風ダークテーマに適合)
- CSS variables: Yes

### Step 2: shadcn/ui コンポーネント追加

```bash
# 基本コンポーネント
npx shadcn@latest add button card input textarea label
npx shadcn@latest add dialog sheet drawer
npx shadcn@latest add dropdown-menu context-menu command
npx shadcn@latest add toast sonner
npx shadcn@latest add form
npx shadcn@latest add badge avatar
npx shadcn@latest add calendar
npx shadcn@latest add checkbox
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add tooltip
npx shadcn@latest add tabs
npx shadcn@latest add resizable
npx shadcn@latest add collapsible
```

### Step 3: 追加ライブラリ

```bash
# 状態管理・データ取得
npm install @tanstack/react-query zustand

# フォーム
npm install react-hook-form @hookform/resolvers

# ドラッグ&ドロップ + ツリービュー
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install react-arborist

# アニメーション
npm install framer-motion

# パズルレイアウト
npm install react-grid-layout
npm install -D @types/react-grid-layout

# リッチエディタ
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
npm install @tiptap/extension-link @tiptap/extension-image @tiptap/extension-code-block-lowlight
npm install lowlight

# ユーティリティ
npm install date-fns clsx tailwind-merge
npm install lucide-react
npm install cmdk
```

---

## 📁 ディレクトリ構成（Next.js App Router 準拠）

```
src/
├── app/                                # App Router（ルーティング専用）
│   ├── (auth)/                         # 認証グループ（未認証でアクセス可）
│   │   ├── layout.tsx                  # 認証用レイアウト（中央配置）
│   │   ├── sign-in/
│   │   │   └── page.tsx                # サインイン画面
│   │   └── link-device/
│   │       └── page.tsx                # デバイス追加画面
│   │
│   ├── (workspace)/                    # ワークスペースグループ（認証必須）
│   │   ├── layout.tsx                  # VSCode風レイアウト（認証チェック）
│   │   ├── page.tsx                    # メインダッシュボード
│   │   ├── loading.tsx                 # ローディングUI
│   │   ├── error.tsx                   # エラーハンドリング
│   │   └── not-found.tsx               # 404ページ
│   │
│   ├── api/                            # API Routes（既存）
│   │   └── ...
│   │
│   ├── layout.tsx                      # ルートレイアウト（Providers）
│   ├── page.tsx                        # ルート（リダイレクト専用）
│   ├── globals.css
│   └── error.tsx                       # グローバルエラー
│
├── components/                         # 共有UIコンポーネント
│   ├── ui/                             # shadcn/ui（自動生成）
│   │
│   ├── providers/                      # Context Providers（全てClient）
│   │   ├── index.tsx                   # 統合Provider
│   │   ├── query-provider.tsx          # TanStack Query
│   │   ├── theme-provider.tsx          # テーマ（next-themes）
│   │   └── dnd-provider.tsx            # @dnd-kit
│   │
│   ├── auth/                           # 認証UI
│   │   ├── sign-in-form.tsx            # Client: WebAuthn操作
│   │   ├── link-code-form.tsx          # Client: コード入力
│   │   └── auth-guard.tsx              # Server: 認証チェック
│   │
│   ├── workspace/                      # ワークスペースUI
│   │   ├── workspace-layout.tsx        # Server: 全体レイアウト
│   │   ├── workspace-shell.tsx         # Client: インタラクティブシェル
│   │   │
│   │   ├── activity-bar/
│   │   │   └── activity-bar.tsx        # Client: アイコンバー
│   │   │
│   │   ├── sidebar/
│   │   │   ├── sidebar.tsx             # Client: サイドバーコンテナ
│   │   │   ├── sidebar-resizer.tsx     # Client: リサイズハンドル
│   │   │   └── sidebar-content.tsx     # Client: ビュー切り替え
│   │   │
│   │   ├── header/
│   │   │   ├── header-bar.tsx          # Client: ヘッダー全体
│   │   │   ├── tab-bar.tsx             # Client: タブ管理
│   │   │   ├── global-actions.tsx      # Client: 右上アクション
│   │   │   ├── header-search.tsx       # Client: 検索ボタン
│   │   │   └── header-trash.tsx        # Client: ゴミ箱ボタン
│   │   │
│   │   ├── editor/
│   │   │   ├── editor-area.tsx         # Client: エディタエリア
│   │   │   └── editor-tabs.tsx         # Client: タブ表示
│   │   │
│   │   ├── panel/
│   │   │   ├── panel.tsx               # Client: 下部パネル
│   │   │   ├── panel-tabs.tsx          # Client: パネルタブ
│   │   │   └── panel-resizer.tsx       # Client: リサイズ
│   │   │
│   │   ├── command-palette.tsx         # Client: Ctrl+P
│   │   └── keyboard-handler.tsx        # Client: ショートカット
│   │
│   ├── explorer/                       # Explorerビュー
│   │   ├── explorer-view.tsx           # Client: コンテナ
│   │   ├── project-tree.tsx            # Client: ツリー本体
│   │   ├── tree-item.tsx               # Client: アイテム
│   │   └── tree-context-menu.tsx       # Client: 右クリック
│   │
│   ├── notes/
│   │   ├── note-list.tsx               # Server: 一覧取得
│   │   ├── note-list-client.tsx        # Client: 表示/操作
│   │   ├── note-card.tsx               # Client: カード
│   │   ├── note-editor.tsx             # Client: Tiptapエディタ
│   │   └── note-editor-skeleton.tsx    # ローディング
│   │
│   ├── projects/
│   │   ├── project-list.tsx            # Server: 一覧取得
│   │   └── project-item.tsx            # Client: 表示
│   │
│   ├── tags/
│   │   ├── tag-list.tsx                # Server: 一覧取得
│   │   ├── tag-badge.tsx               # Client: バッジ
│   │   └── tag-selector.tsx            # Client: 選択UI
│   │
│   ├── tasks/
│   │   ├── task-list.tsx               # Server: 一覧取得
│   │   ├── task-item.tsx               # Client: アイテム
│   │   └── task-checkbox.tsx           # Client: チェック
│   │
│   ├── widgets/                        # パズルウィジェット
│   │   ├── widget-grid.tsx             # Client: グリッド
│   │   ├── widget-wrapper.tsx          # Client: ラッパー
│   │   ├── notes-widget.tsx
│   │   ├── calendar-widget.tsx
│   │   ├── tasks-widget.tsx
│   │   └── tags-widget.tsx
│   │
│   ├── trash/
│   │   ├── trash-panel.tsx             # Client: ゴミ箱パネル
│   │   └── trash-drop-zone.tsx         # Client: ドロップゾーン
│   │
│   └── common/
│       ├── loading-spinner.tsx
│       ├── error-boundary.tsx
│       ├── empty-state.tsx
│       └── confirm-dialog.tsx
│
├── features/                           # 機能ごとのロジック
│   ├── auth/
│   │   ├── actions/
│   │   │   └── auth-actions.ts         # Server Actions
│   │   ├── hooks/
│   │   │   ├── use-session.ts          # セッション取得
│   │   │   └── use-webauthn.ts         # WebAuthn操作
│   │   └── lib/
│   │       └── webauthn-client.ts      # WebAuthnクライアント
│   │
│   ├── notes/
│   │   ├── actions/
│   │   │   └── note-actions.ts         # Server Actions
│   │   ├── hooks/
│   │   │   ├── use-notes.ts            # 一覧取得
│   │   │   ├── use-note.ts             # 単一取得
│   │   │   └── use-note-mutations.ts   # 作成/更新/削除
│   │   ├── lib/
│   │   │   └── note-helpers.ts
│   │   └── types.ts
│   │
│   ├── projects/
│   │   ├── actions/
│   │   │   └── project-actions.ts
│   │   ├── hooks/
│   │   │   ├── use-projects.ts
│   │   │   └── use-project-tree.ts
│   │   └── types.ts
│   │
│   ├── tags/
│   │   ├── actions/
│   │   │   └── tag-actions.ts
│   │   ├── hooks/
│   │   │   └── use-tags.ts
│   │   └── types.ts
│   │
│   ├── tasks/
│   │   ├── actions/
│   │   │   └── task-actions.ts
│   │   ├── hooks/
│   │   │   └── use-tasks.ts
│   │   └── types.ts
│   │
│   └── workspace/
│       ├── hooks/
│       │   ├── use-workspace.ts        # レイアウト状態
│       │   ├── use-tabs.ts             # タブ管理
│       │   ├── use-trash.ts            # ゴミ箱
│       │   └── use-keyboard.ts         # ショートカット
│       └── stores/                     # Zustand（クライアント状態のみ）
│           ├── workspace-store.ts      # サイドバー、パネル
│           ├── tabs-store.ts           # 開いているタブ
│           ├── layout-store.ts         # ウィジェット配置
│           └── trash-store.ts          # ゴミ箱
│
├── lib/                                # 共有ユーティリティ
│   ├── api/                            # APIクライアント
│   │   ├── client.ts                   # fetch wrapper
│   │   ├── notes.ts
│   │   ├── projects.ts
│   │   ├── tags.ts
│   │   └── tasks.ts
│   │
│   ├── utils/
│   │   ├── cn.ts                       # clsx + tailwind-merge
│   │   ├── date.ts
│   │   ├── tree.ts
│   │   └── keyboard.ts
│   │
│   ├── validation/                     # Zod スキーマ（既存）
│   │   └── ...
│   │
│   └── prisma.ts                       # 既存
│
├── server/                             # サーバーサイドロジック（既存）
│   ├── auth/
│   ├── services/
│   ├── repositories/
│   └── storage/
│
└── types/
    ├── workspace.ts
    ├── tree.ts
    └── widget.ts
```

---

## 🏗️ アーキテクチャの原則

### 1. Server Components vs Client Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Server Components（デフォルト）                       │
├─────────────────────────────────────────────────────────────────────────┤
│ ✓ データベースアクセス（Prisma経由）                                    │
│ ✓ 認証チェック（auth()）                                                │
│ ✓ 環境変数へのアクセス（秘密鍵含む）                                    │
│ ✓ 重い依存関係（バンドルに含まれない）                                  │
│ ✓ SEO/OGP用のメタデータ                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓ props で渡す
┌─────────────────────────────────────────────────────────────────────────┐
│                    Client Components ('use client')                     │
├─────────────────────────────────────────────────────────────────────────┤
│ ✓ useState, useEffect, useRef                                           │
│ ✓ イベントハンドラー（onClick, onChange, onSubmit等）                   │
│ ✓ ブラウザAPI（localStorage, window等）                                 │
│ ✓ カスタムフック（use-* で状態管理）                                    │
│ ✓ サードパーティクライアントライブラリ（DnD, Tiptap, framer-motion等）  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. データフローパターン

```
┌─────────────────────────────────────────────────────────────────────────┐
│ パターンA: Server Component → Client Component（初期データ）            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Server Component          Client Component                            │
│   ┌─────────────────┐      ┌─────────────────┐                         │
│   │ async function  │      │ 'use client'    │                         │
│   │                 │      │                 │                         │
│   │ const data =    │─────>│ initialData     │                         │
│   │   await fetch() │ props│   ↓             │                         │
│   │                 │      │ useQuery with   │                         │
│   │ return <Client  │      │ initialData     │                         │
│   │   data={data}/> │      │                 │                         │
│   └─────────────────┘      └─────────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ パターンB: Client Component → Server Action（データ更新）               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Client Component          Server Action           Service Layer       │
│   ┌─────────────────┐      ┌─────────────────┐    ┌─────────────────┐  │
│   │ 'use client'    │      │ 'use server'    │    │                 │  │
│   │                 │      │                 │    │ noteService     │  │
│   │ onClick={() => │──────>│ async function  │───>│ .create()       │  │
│   │   createNote()  │      │   createNote()  │    │                 │  │
│   │ }               │      │   auth check    │    │                 │  │
│   │                 │<─────│   revalidate    │<───│                 │  │
│   └─────────────────┘      └─────────────────┘    └─────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. 認証の流れ

```typescript
// app/(workspace)/layout.tsx - Server Component
import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { Providers } from '@/components/providers';
import { WorkspaceLayout } from '@/components/workspace/workspace-layout';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server Component で認証チェック
  const session = await auth();
  
  if (!session?.user) {
    redirect('/sign-in');
  }
  
  return (
    <Providers>
      <WorkspaceLayout user={session.user}>
        {children}
      </WorkspaceLayout>
    </Providers>
  );
}
```

---

## 📄 主要ページ実装例

### ルートページ（リダイレクト専用）

```typescript
// app/page.tsx
import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const session = await auth();
  
  // 認証済み → ワークスペースへ
  // 未認証 → サインインへ
  redirect(session ? '/' : '/sign-in');
  
  // このリターンは実行されないが、TypeScript用に必要
  return null;
}
```

### 認証ページ

```typescript
// app/(auth)/sign-in/page.tsx
import { auth } from '@/server/auth';
import { redirect } from 'next/navigation';
import { SignInForm } from '@/components/auth/sign-in-form';
import { userReadService } from '@/server/services/users';

export default async function SignInPage() {
  // 既に認証済みならリダイレクト
  const session = await auth();
  if (session) {
    redirect('/');
  }
  
  // ユーザー数を取得（初回登録 vs ログイン判定）
  const userCount = await userReadService.count();
  const isFirstUser = userCount === 0;
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignInForm isFirstUser={isFirstUser} />
    </div>
  );
}
```

### ワークスペースページ

```typescript
// app/(workspace)/page.tsx
import { Suspense } from 'react';
import { auth } from '@/server/auth';
import { noteReadService } from '@/server/services/notes';
import { NoteList } from '@/components/notes/note-list';
import { NoteListSkeleton } from '@/components/notes/note-list-skeleton';

export default async function WorkspacePage() {
  const session = await auth();
  
  // Server Component でデータ取得
  const recentNotes = await noteReadService.listRecent(session!.user.id, 10);
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">最近のノート</h1>
      <Suspense fallback={<NoteListSkeleton />}>
        <NoteList initialNotes={recentNotes} />
      </Suspense>
    </div>
  );
}
```

---

## 🔧 コンポーネント実装パターン

### Server → Client のデータ受け渡し

```typescript
// components/notes/note-list.tsx (Server Component)
import { noteReadService } from '@/server/services/notes';
import { NoteListClient } from './note-list-client';

interface Props {
  userId: string;
  projectId?: string;
}

export async function NoteList({ userId, projectId }: Props) {
  // Server Component でデータ取得
  const notes = await noteReadService.list(userId, { projectId });
  
  // Client Component に初期データとして渡す
  return <NoteListClient initialNotes={notes} projectId={projectId} />;
}
```

```typescript
// components/notes/note-list-client.tsx (Client Component)
'use client';

import { useNotes } from '@/features/notes/hooks/use-notes';
import { NoteCard } from './note-card';
import type { Note } from '@/features/notes/types';

interface Props {
  initialNotes: Note[];
  projectId?: string;
}

export function NoteListClient({ initialNotes, projectId }: Props) {
  // TanStack Query で状態管理（初期データを渡す）
  const { data: notes } = useNotes(projectId, { 
    initialData: initialNotes 
  });
  
  return (
    <div className="grid gap-4">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
```

### Server Actions の実装

```typescript
// features/notes/actions/note-actions.ts
'use server';

import { auth } from '@/server/auth';
import { revalidatePath } from 'next/cache';
import { noteWriteService } from '@/server/services/notes';
import { createNoteSchema } from '@/lib/validation/note-schemas';
import { z } from 'zod';

// 型安全なServer Action
export async function createNoteAction(
  input: z.infer<typeof createNoteSchema>
) {
  // 1. 認証チェック（必須）
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  // 2. バリデーション
  const validated = createNoteSchema.parse(input);
  
  // 3. サービス層で処理
  const note = await noteWriteService.create({
    ...validated,
    ownerId: session.user.id,
  });
  
  // 4. キャッシュ無効化
  revalidatePath('/');
  
  return note;
}

export async function deleteNoteAction(noteId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  await noteWriteService.moveToTrash(noteId, session.user.id);
  
  revalidatePath('/');
}
```

### TanStack Query フック

```typescript
// features/notes/hooks/use-notes.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createNoteAction, deleteNoteAction } from '../actions/note-actions';
import { getNotes } from '@/lib/api/notes';
import type { Note } from '../types';

interface UseNotesOptions {
  initialData?: Note[];
}

export function useNotes(projectId?: string, options?: UseNotesOptions) {
  return useQuery({
    queryKey: ['notes', { projectId }],
    queryFn: () => getNotes({ projectId }),
    initialData: options?.initialData,
    staleTime: 1000 * 60, // 1分間は再取得しない
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createNoteAction,
    onSuccess: () => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteNoteAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
```

### Zustand Store（UIステートのみ）

```typescript
// features/workspace/stores/workspace-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  // サイドバー
  sidebarOpen: boolean;
  sidebarWidth: number;
  activeView: 'explorer' | 'tags' | 'calendar' | 'tasks';
  
  // パネル
  panelOpen: boolean;
  panelHeight: number;
  
  // アクション
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setActiveView: (view: WorkspaceState['activeView']) => void;
  togglePanel: () => void;
  setPanelHeight: (height: number) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      // 初期値
      sidebarOpen: true,
      sidebarWidth: 250,
      activeView: 'explorer',
      panelOpen: true,
      panelHeight: 200,
      
      // アクション
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setActiveView: (view) => set({ activeView: view }),
      togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
      setPanelHeight: (height) => set({ panelHeight: height }),
    }),
    { 
      name: 'workspace-storage',
      // localStorage に保存
    }
  )
);
```

---

## 🔒 セキュリティ実装

### 認証ミドルウェア

```typescript
// middleware.ts
import { auth } from '@/server/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  
  const isAuthPage = nextUrl.pathname.startsWith('/sign-in') ||
                     nextUrl.pathname.startsWith('/link-device');
  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isPublicFile = nextUrl.pathname.startsWith('/_next') ||
                       nextUrl.pathname.includes('.');
  
  // 公開ファイルはスキップ
  if (isPublicFile) {
    return NextResponse.next();
  }
  
  // 認証ページへのアクセス（ログイン済みならリダイレクト）
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  
  // 保護ページへのアクセス（未認証ならサインインへ）
  if (!isAuthPage && !isApiRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### APIルートの認証ガード

```typescript
// lib/api/with-auth.ts
import { auth } from '@/server/auth';
import { NextResponse } from 'next/server';

type Handler<T> = (userId: string) => Promise<T>;

export async function withAuth<T>(handler: Handler<T>): Promise<NextResponse> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const result = await handler(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof Error && error.message === 'Not Found') {
      return NextResponse.json(
        { error: 'Not Found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

---

## 🚀 パフォーマンス最適化

### 1. Suspense境界の配置

```typescript
// app/(workspace)/layout.tsx
import { Suspense } from 'react';

export default function WorkspaceLayout({ children }) {
  return (
    <div className="flex h-screen">
      {/* サイドバーは独立してローディング */}
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      
      <main className="flex-1 flex flex-col">
        {/* ヘッダーは独立してローディング */}
        <Suspense fallback={<HeaderSkeleton />}>
          <Header />
        </Suspense>
        
        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
```

### 2. 動的インポート

```typescript
// components/notes/note-editor.tsx
'use client';

import dynamic from 'next/dynamic';
import { NoteEditorSkeleton } from './note-editor-skeleton';

// Tiptap は重いのでdynamic import
const TiptapEditor = dynamic(
  () => import('./tiptap-editor').then((mod) => mod.TiptapEditor),
  {
    loading: () => <NoteEditorSkeleton />,
    ssr: false, // Tiptap はSSR非対応
  }
);

export function NoteEditor({ noteId }: { noteId: string }) {
  return <TiptapEditor noteId={noteId} />;
}
```

### 3. 画像最適化

```typescript
// components/common/optimized-image.tsx
import Image from 'next/image';

interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export function OptimizedImage({ src, alt, width = 200, height = 150 }: Props) {
  // Supabase Storage のURLをnext/imageで最適化
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      className="rounded-md object-cover"
    />
  );
}
```

---

## ✅ 公開前チェックリスト

### セキュリティ
- [ ] 全ての保護ページで `auth()` チェック
- [ ] 全ての Server Actions で認証確認
- [ ] 全ての API Routes で認証確認
- [ ] 環境変数の `NEXT_PUBLIC_` 使い分け確認
- [ ] XSS対策（`dangerouslySetInnerHTML` 未使用）
- [ ] 入力値の Zod バリデーション

### パフォーマンス
- [ ] Suspense境界の適切な配置
- [ ] 重いライブラリの動的インポート
- [ ] 画像の next/image 使用
- [ ] 不要な再レンダリング防止

### UX/アクセシビリティ
- [ ] ローディング状態（Skeleton）
- [ ] エラーハンドリング（error.tsx）
- [ ] 404ページ（not-found.tsx）
- [ ] トースト通知
- [ ] キーボードナビゲーション
- [ ] aria-label の設定
- [ ] フォーカス表示

### 機能要件
- [ ] パスキー認証（登録/ログイン）
- [ ] デバイス追加（リンクコード）
- [ ] ノートCRUD
- [ ] プロジェクト階層管理
- [ ] タグ管理
- [ ] タスク管理
- [ ] ドラッグ&ドロップ
- [ ] キーボードショートカット
- [ ] グローバルゴミ箱

---

## 🎯 実装フェーズ

### Phase 1: 基盤構築（4-5日）
- [ ] Providers セットアップ（Query, Theme, DnD）
- [ ] shadcn/ui 初期化・コンポーネント追加
- [ ] ミドルウェア設定
- [ ] 認証画面（サインイン、デバイス追加）
- [ ] ルートレイアウト

### Phase 2: ワークスペースUI（5-6日）
- [ ] VSCode風レイアウト構築
  - [ ] アクティビティバー
  - [ ] サイドバー（リサイズ可能）
  - [ ] ヘッダー + タブバー
  - [ ] 下部パネル
- [ ] ツリービュー（react-arborist）
- [ ] コマンドパレット（Ctrl+P）

### Phase 3: コア機能（6-7日）
- [ ] ノート一覧/作成/編集/削除
- [ ] Tiptap エディタ統合
- [ ] プロジェクト管理
- [ ] タグ管理
- [ ] タスク管理

### Phase 4: インタラクション（3-4日）
- [ ] ドラッグ&ドロップ（階層変更、ゴミ箱）
- [ ] キーボードショートカット
- [ ] アニメーション
- [ ] トースト通知

### Phase 5: パズルレイアウト（2-3日）
- [ ] react-grid-layout 導入
- [ ] ウィジェット定義
- [ ] レイアウト保存/復元

### Phase 6: 最適化・テスト（2-3日）
- [ ] パフォーマンス最適化
- [ ] E2Eテスト準備
- [ ] アクセシビリティ確認

---

## 📝 コーディング規約

### ファイル命名規則
| タイプ | 命名 | 例 |
|--------|------|-----|
| Server Component | `name.tsx` | `note-list.tsx` |
| Client Component | `name.tsx` + 'use client' | `note-card.tsx` |
| Server Action | `feature-actions.ts` | `note-actions.ts` |
| Hook | `use-feature.ts` | `use-notes.ts` |
| Store | `feature-store.ts` | `workspace-store.ts` |
| 型定義 | `types.ts` | `types.ts` |

### インポート順序
```typescript
// 1. React / Next.js
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

// 2. サードパーティ
import { useQuery } from '@tanstack/react-query';

// 3. サーバー層（Server Componentのみ）
import { auth } from '@/server/auth';

// 4. コンポーネント
import { Button } from '@/components/ui/button';

// 5. フック / ユーティリティ
import { useNotes } from '@/features/notes/hooks/use-notes';
import { cn } from '@/lib/utils/cn';

// 6. 型（type-only import）
import type { Note } from '@/features/notes/types';
```

### Client Component の明示
```typescript
'use client';  // ファイル先頭に必ず記載

// 以下の場合に必要:
// - useState, useEffect, useRef 等のフック使用
// - onClick, onChange 等のイベントハンドラー
// - window, localStorage 等のブラウザAPI
// - 'use client' が必要なサードパーティライブラリ
```

### エラーハンドリング
```typescript
// features/notes/actions/note-actions.ts
'use server';

export async function createNoteAction(input: CreateNoteInput) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: 'Unauthorized' };
    }
    
    const note = await noteWriteService.create({...});
    revalidatePath('/');
    
    return { data: note };
  } catch (error) {
    console.error('Failed to create note:', error);
    return { error: 'Failed to create note' };
  }
}

// Client側での使用
const { mutate, isPending, error } = useCreateNote();
```
