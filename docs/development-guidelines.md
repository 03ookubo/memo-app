# 開発ルール（拡張性重視）

この文書は「メモを中心に必要なときだけ Todo 機能を活用するアプリ」を安全かつ拡張しやすい状態で開発・運用するためのルール集です。新機能の追加、既存機能の変更、データ構造の拡張を想定しています。

## データモデル

- Prisma スキーマ（`prisma/schema.prisma`）の変更は既存利用者を壊さない形で行い、新しい列やテーブルを追加する形を基本とします。
- 任意機能に関わるフィールドは `null` 許容を検討し、enum や範囲制限は慎重に導入します。
- リレーションや意図が分かりづらい箇所にはコメントを残し、将来の読み手が把握しやすいようにします。

## マイグレーション

- Supabase/Postgres を正とし、マイグレーション履歴を厳格に管理します。
- 既存カラムを変更 or 削除する場合はロールバック方法とダウンタイム影響を先に整理します。
- `.env` やシークレットは決して共有せず、ローカルで管理します。

## サービス・API レイヤ

- Prisma を直接各コンポーネントから呼び出すのではなく、サービス層（例: `src/server/...`）を経由します。
- API 仕様は Markdown や OpenAPI で短くてもよいので記載し、動作契約を明確にします。
- サービス層にはバリデーション、トランザクション、権限チェックなどを集中させます。

## Repository 層 / Service 層の設計ルール

### 設計原則

本プロジェクトでは **薄い Repository** パターンを採用し、責務を明確に分離します。

| 層             | 責務             | やること                                               | やらないこと                                       |
| -------------- | ---------------- | ------------------------------------------------------ | -------------------------------------------------- |
| **Repository** | 純粋な CRUD      | DB 操作（単一テーブル）                                | バリデーション、トランザクション制御、権限チェック |
| **Service**    | ビジネスロジック | バリデーション、トランザクション、複数 Repository 連携 | 直接 Prisma を呼ぶ                                 |

### Repository 層のルール

**必須メソッド（各 Repository に実装）:**

- `findById(id, include?, tx?)` — 単一レコード取得（主キー）
- `findMany(where?, options?, include?, tx?)` — 複数レコード取得
- `create(data, tx?)` — 作成
- `updateById(id, data, tx?)` — 更新
- `deleteById(id, tx?)` — 物理削除
- `count(where?, tx?)` — 件数取得

**許可されるオプションメソッド:**

- 一意制約によるルックアップ（例: `findByOwnerIdAndName`）
- 集約値の取得（例: `getMaxPosition`）
- 外部キーによる検索（例: `findByNoteId`）

**禁止:**

- ソフトデリート/アーカイブ操作（Service 層で `updateById` を使う）
- 複数テーブルにまたがる操作
- ビジネスルールを含むフィルタリング（例: 「アクティブなノート」は Service 層で定義）

### Service 層のルール

**責務:**

- トランザクション制御（`prisma.$transaction`）
- バリデーション（Zod スキーマ等）
- 権限チェック
- 複数 Repository の連携
- ビジネスルールの実装（ソフトデリート、アーカイブ等）

**ファイル分割方針（ドメインごと）:**

```
src/server/services/notes/
  ├── note.read.service.ts     # 読み取り系（一覧、検索、詳細取得）
  ├── note.write.service.ts    # 作成・更新系
  ├── note.archive.service.ts  # アーカイブ/アンアーカイブ
  └── note.delete.service.ts   # ソフトデリート/復元/物理削除
```

### トランザクションの扱い

- **Repository 層**: トランザクションを**受け取る**（`tx` パラメータ、デフォルトは `prisma`）
- **Service 層**: トランザクションを**開始・制御する**（`prisma.$transaction`）

```typescript
// Service層でのトランザクション例
async function createNoteWithTask(data: CreateInput) {
  return prisma.$transaction(async (tx) => {
    const note = await notesRepository.create(noteData, tx);
    await tasksRepository.create(
      { note: { connect: { id: note.id } }, ...taskData },
      tx
    );
    return note;
  });
}
```

### 命名規約

- Repository: `<model>sRepository`（複数形、例: `notesRepository`）
- Service: `<model>.<operation>.service.ts`（例: `note.read.service.ts`）
- 関数名: 動詞 + 対象（例: `findById`, `softDeleteNote`, `archiveNote`）

## ドメイン分離

- メモ機能と Todo 的な拡張機能をフォルダで分け、依存方向を明確にします（例: `src/features/notes`, `src/features/todos`）。
- 機能トグルや設定値はコンフィグ／コンテキストとしてまとめ、オン・オフの切り替えを容易にします。

## テストと検証

- クリティカルなサービス、スキーマ制約、変換ロジックにはユニットテスト・統合テストを用意します。
- 新機能追加時は既存テストを更新し、リグレッションを防ぎます。

## セキュリティ

- 認証・認可ロジックを共通化し、すべての機能が同じゲートを通るようにします。
- ログイン情報やセッション管理は安全な方法で扱い、AI に共有しません。

## オブザーバビリティ

- 作成／更新／削除などの重要イベントにログとメトリクス記録を仕込み、拡張後の影響を把握します。
- 異常検知やパフォーマンス問題のトラブルシューティングを容易にするため、ログ形式を揃えます。

## フロントエンド

- Tailwind のユーティリティと薄いラッパコンポーネントを活用し、UI の拡張・差し替えを容易にします。
- メモ閲覧の可読性と操作ステップ数を意識し、拡張機能を追加しても複雑になりすぎないようにします。

---

このルール集はプロジェクトの成長に合わせて更新してください。修正時はコミットメッセージや PR 説明に要約を残し、関係者が把握できるようにします。
