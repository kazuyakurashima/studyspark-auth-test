# 新規ユーザー登録エラーの修正手順

## エラーの原因
"Database error saving new user" というエラーは、以下の原因で発生しています：

1. `profiles`テーブルの`family_id`カラムがUNIQUE制約を持っているため、複数のユーザーが作成できない
2. トリガー関数でのエラーハンドリング不足

## 修正手順

### 方法1: profilesテーブルを修正（推奨）

Supabase SQL Editorで以下を実行：

```sql
-- 1. まず既存のプロファイルデータをバックアップ（必要な場合）
SELECT * FROM public.profiles;

-- 2. family_idのUNIQUE制約を削除
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_family_id_key;

-- 3. トリガー関数を更新
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- プロファイルが既に存在する場合はスキップ
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- プロファイルを作成（family_idはデフォルト値を使用）
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
  )
  ON CONFLICT (id) DO NOTHING;  -- 重複エラーを回避
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生してもユーザー作成は続行
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### 方法2: 完全にテーブルを作り直す（クリーンインストール）

もし既存のデータがない場合は、以下の順序で実行：

1. **01_create_tables_fixed.sql** を実行（profilesテーブルを再作成）
2. **02_row_level_security.sql** を再実行
3. **03_auth_triggers.sql** を再実行

## 確認方法

修正後、以下を確認：

1. 新規ユーザー登録を試す
2. 複数のユーザーが登録できることを確認
3. 各ユーザーに異なる`family_id`が割り当てられることを確認

```sql
-- プロファイル確認クエリ
SELECT id, family_id, display_name, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC;
```

## family_idの設計について

### 現在の仕様
- 各ユーザーは登録時に一意の`family_id`を取得
- 同じ家族のメンバーは同じ`family_id`を共有する必要がある

### 将来の改善案
1. 保護者が最初に登録時に`family_id`を生成
2. 保護者が生徒を追加する際に、同じ`family_id`を付与
3. 家族メンバー管理機能で`family_id`を統合

## トラブルシューティング

### エラーが継続する場合

1. Supabase Dashboardの「Authentication」→「Logs」でエラー詳細を確認
2. SQL Editorで以下を実行して、トリガーの状態を確認：

```sql
-- トリガー確認
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- profilesテーブルの制約確認
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'profiles';
```

### 既存ユーザーのプロファイル作成

既にauth.usersに存在するがprofilesにレコードがないユーザーの場合：

```sql
-- 既存ユーザーのプロファイルを手動作成
INSERT INTO public.profiles (id, display_name, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'display_name', email),
  COALESCE(raw_user_meta_data->>'role', 'parent')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```