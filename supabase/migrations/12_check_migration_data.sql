-- 移管申請データの確認

-- 1. email_migration_logsテーブルの全データを確認
SELECT 
  'All Migration Requests:' as title;

SELECT 
  id,
  user_id,
  old_email,
  new_email,
  status,
  requested_at,
  approved_at,
  completed_at,
  approved_by,
  notes
FROM public.email_migration_logs
ORDER BY requested_at DESC;

-- 2. ユーザー情報と結合して詳細を確認
SELECT 
  'Migration Requests with User Info:' as title;

SELECT 
  m.id,
  m.status,
  m.old_email,
  m.new_email,
  m.requested_at,
  u.email as current_email,
  p.display_name,
  p.role
FROM public.email_migration_logs m
LEFT JOIN auth.users u ON m.user_id = u.id
LEFT JOIN public.profiles p ON m.user_id = p.id
ORDER BY m.requested_at DESC;

-- 3. 保護者1（toshin.hitachi+test001@gmail.com）の移管申請を確認
SELECT 
  'Parent 1 Migration Requests:' as title;

SELECT 
  m.*,
  p.display_name
FROM public.email_migration_logs m
JOIN auth.users u ON m.user_id = u.id
JOIN public.profiles p ON m.user_id = p.id
WHERE u.email = 'toshin.hitachi+test001@gmail.com';

-- 4. RLSポリシーの確認
SELECT 
  'Current RLS Policies for email_migration_logs:' as title;

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'email_migration_logs'
ORDER BY policyname;