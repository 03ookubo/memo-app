# 将来の拡張機能実装ガイド

このドキュメントは、チャットログ（`2025-12-5 9-14-49-___________.md`）で議論された拡張機能を、現在のアーキテクチャ上でどのように実装するかをまとめたものです。

## 1. カレンダー連携・スケジュール管理

### 要件
- ノートに日付を紐付けてスケジュールとして管理する
- Google Calendar 等の外部カレンダーと同期する
- 「自然言語」で予定を作成する

### 実装方針
1. **データモデル**:
   - `Event` モデル（`Note` と 1:1）を使用します。`startAt`, `endAt`, `location`, `recurrenceRule` を持ちます。
   - `Integration` モデルで外部カレンダーの認証トークン（OAuth2）を管理します。

2. **API / サービス**:
   - `src/server/services/events/event.service.ts`: イベントの CRUD。
   - `src/server/services/integrations/google-calendar.service.ts`: Google Calendar API との通信、同期ロジック。
   - `src/server/services/notes/note.write.service.ts`: ノート作成・更新時に `event` 情報を同時に保存するよう拡張。

3. **同期フロー**:
   - ユーザーが「Google Calendar連携」を有効化（`Integration` レコード作成）。
   - 定期実行ジョブ（Vercel Cron 等）または Webhook で、外部カレンダーの変更を検知し、`Event` テーブルに反映。
   - アプリ内で `Event` を変更した際、`google-calendar.service.ts` を通じて外部へ反映。

## 2. タスク管理・習慣管理

### 要件
- タスクの管理、リマインダー
- 習慣（繰り返しタスク）の管理

### 実装方針
1. **データモデル**:
   - 既存の `Task` モデルに `recurrenceRule` (iCal形式) を追加済みです。
   - これにより「毎週月曜日」などの繰り返しタスクを表現可能です。

2. **ロジック**:
   - タスク完了時、`recurrenceRule` があれば次のタスクインスタンスを自動生成するロジックを `task.service.ts` に実装します。

## 3. パスワード・機密情報管理

### 要件
- パスワードや機密メモを安全に管理する（Notionでは非推奨とされる機能）

### 実装方針
1. **データモデル**:
   - `Note` モデルに `isEncrypted` フラグを追加済みです。

2. **セキュリティ設計**:
   - **クライアントサイド暗号化**を推奨します。
   - サーバーには暗号化された `bodyMarkdown` のみが送信されます。
   - 復号鍵はユーザーのパスキーまたは別のマスターパスワードから派生させ、サーバーには保存しません。
   - `src/lib/crypto` に暗号化・復号ロジックを集約します。

## 4. 自然言語による予定作成（AI/NLP）

### 要件
- 「明日 14:00 会議」と入力すると自動でカレンダー登録される

### 実装方針
1. **アーキテクチャ**:
   - `src/server/services/nlp/parser.service.ts` を作成。
   - OpenAI API またはローカルの NLP ライブラリ（`chrono-node` 等）を使用。

2. **フロー**:
   - ノート保存時、または専用の「解析ボタン」押下時に `parser.service.ts` を呼び出す。
   - テキストから日付・時間を抽出し、`Event` または `Task` オブジェクトを生成して提案。
   - ユーザーが承認すれば DB に保存。

## まとめ

現在のアーキテクチャ（Prismaスキーマ、Service/Repository層の分離）は、これらの拡張に対して十分に開かれています。
特に `Note` を中心としつつ、`Event`, `Task`, `Integration` を周辺に配置する構成により、機能追加が既存機能に影響を与えにくい設計になっています。
