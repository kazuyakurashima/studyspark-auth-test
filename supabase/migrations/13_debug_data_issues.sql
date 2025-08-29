-- データ復活問題の調査

-- 1. 現在のトリガーを確認
SELECT 
  'Current Triggers:' as title;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  trigger_schema,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- 2. プロファイル作成トリガー関数の確認
SELECT 
  'Profile Creation Functions:' as title;

SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname LIKE '%profile%' 
   OR prosrc LIKE '%profiles%';

-- 3. 現在の全ユーザーとプロファイル
SELECT 
  'All Users and Profiles:' as title;

SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created,
  p.display_name,
  p.role,
  p.family_id,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- 4. メール確認状況
SELECT 
  'Email Confirmation Status:' as title;

SELECT 
  id,
  email,
  email_confirmed_at,
  confirmation_sent_at,
  created_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;