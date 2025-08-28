-- ======================================
-- プロファイルテーブルと移管ログテーブルの修正
-- ======================================

-- 1. 既存ユーザーのプロファイルが存在しない場合は作成
INSERT INTO public.profiles (id, display_name, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'display_name', email, 'ユーザー'),
  COALESCE(raw_user_meta_data->>'role', 'parent')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. トリガー関数の修正（より確実にプロファイルを作成）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_family_id TEXT;
BEGIN
  -- family_idを生成
  generated_family_id := 'FAM-' || substr(gen_random_uuid()::text, 1, 8);
  
  -- プロファイルを作成
  INSERT INTO public.profiles (
    id, 
    family_id,
    display_name, 
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    generated_family_id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name', 
      split_part(NEW.email, '@', 1),
      'ユーザー'
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    updated_at = NOW()
  WHERE profiles.display_name IS NULL;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログを出力するが、ユーザー作成は続行
    RAISE LOG 'Profile creation error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 3. email_migration_logsテーブルのRLSポリシーを確認・修正
-- 既存のポリシーを一旦削除
DROP POLICY IF EXISTS "Users can create migration requests" ON public.email_migration_logs;

-- 新しいポリシーを作成（user_idの制約を緩和）
CREATE POLICY "Users can create migration requests" ON public.email_migration_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    status = 'requested'
  );

-- 4. audit_logsテーブルのRLSポリシーを修正
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- より寛容なポリシーに変更
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- 5. デバッグ用：現在のプロファイル状況を確認
SELECT 
  u.id,
  u.email,
  p.family_id,
  p.display_name,
  p.role,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;