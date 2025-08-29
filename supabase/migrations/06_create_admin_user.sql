-- ======================================
-- 管理者ユーザー作成
-- ======================================

-- 現在のユーザーを管理者に設定（テスト用）
-- Supabase Dashboardで以下のSQLを実行してください

-- 1. 特定のユーザーを管理者に設定（メールアドレスを指定）
UPDATE public.profiles 
SET role = 'admin', updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'toshin.hitachi+test003@gmail.com'  -- 実際のメールアドレスに置き換え
);

-- 2. または、最新のユーザーを管理者に設定
-- UPDATE public.profiles 
-- SET role = 'admin', updated_at = NOW()
-- WHERE id = (
--   SELECT id FROM auth.users 
--   ORDER BY created_at DESC 
--   LIMIT 1
-- );

-- 3. 管理者ユーザー確認
SELECT 
  u.email,
  p.display_name,
  p.role,
  p.family_id,
  p.updated_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE p.role = 'admin';

-- 4. 全ユーザーの役割確認
SELECT 
  u.email,
  p.display_name,
  p.role,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;