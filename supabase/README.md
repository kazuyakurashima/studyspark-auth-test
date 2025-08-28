# Supabase データベースマイグレーション

## 概要
このディレクトリには、StudySpark認証テストシステムのデータベースマイグレーションファイルが含まれています。

## マイグレーションファイル

1. **01_create_tables.sql**
   - profiles テーブル（ユーザープロファイル）
   - parent_student_relations テーブル（保護者と生徒の関係）
   - email_migration_logs テーブル（メールアドレス移管ログ）
   - audit_logs テーブル（監査ログ）
   - 必要な関数とトリガー

2. **02_row_level_security.sql**
   - 各テーブルのRLSポリシー設定
   - 適切なアクセス制御の実装

3. **03_auth_triggers.sql**
   - 新規ユーザー登録時のプロファイル自動作成トリガー
   - ユーザー削除時の関連データクリーンアップ

## 実行手順

### 1. Supabase ダッシュボードでの実行

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. プロジェクトを選択
3. 左側メニューから「SQL Editor」を選択
4. 「New query」をクリック
5. マイグレーションファイルの内容をコピー&ペースト
6. 「Run」ボタンをクリックして実行

### 2. 実行順序

必ず以下の順序で実行してください：
1. `01_create_tables.sql` - テーブルと基本構造の作成
2. `02_row_level_security.sql` - RLSポリシーの設定
3. `03_auth_triggers.sql` - 認証関連のトリガー設定

### 3. 確認事項

#### テーブルの確認
SQL Editorで以下のクエリを実行して、テーブルが作成されたことを確認：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

期待される結果：
- audit_logs
- email_migration_logs
- parent_student_relations
- profiles

#### RLSポリシーの確認
```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  roles 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

#### インデックスの確認
```sql
SELECT 
  tablename, 
  indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

## トラブルシューティング

### エラー: "relation already exists"
テーブルが既に存在する場合は、`CREATE TABLE IF NOT EXISTS`を使用しているため無視されます。

### エラー: "permission denied"
管理者権限でログインしていることを確認してください。

### RLSが機能しない
1. テーブルでRLSが有効になっているか確認
2. ポリシーが正しく作成されているか確認
3. auth.uid()が正しく返されているか確認

## セキュリティ注意事項

- **本番環境での実行前に必ずバックアップを取得してください**
- RLSポリシーは慎重にテストしてください
- Service Role Keyは安全に管理してください

## サンプルデータ（開発用）

開発環境でテストする場合のサンプルデータ：

```sql
-- テスト用保護者アカウント作成後に実行
-- （auth.usersにユーザーが存在することが前提）

-- プロファイル作成例
INSERT INTO public.profiles (
  id, 
  role, 
  display_name,
  last_name,
  first_name,
  last_name_kana,
  first_name_kana
) VALUES (
  auth.uid(), -- 現在ログインしているユーザーのID
  'parent',
  'テスト保護者',
  '山田',
  '太郎',
  'ヤマダ',
  'タロウ'
);
```

## 関連ドキュメント

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Trigger Documentation](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)