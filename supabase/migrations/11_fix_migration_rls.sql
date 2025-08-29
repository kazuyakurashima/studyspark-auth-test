-- email_migration_logsのRLSポリシーを修正（無限再帰を回避）

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own migration logs" ON public.email_migration_logs;
DROP POLICY IF EXISTS "Users can create migration requests" ON public.email_migration_logs;
DROP POLICY IF EXISTS "Admins can manage all migration logs" ON public.email_migration_logs;

-- シンプルで再帰のないポリシーを作成

-- 1. SELECT権限 - ログインユーザーは全ての移管ログを閲覧可能（一時的）
CREATE POLICY "migration_select_policy" 
  ON public.email_migration_logs
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL  -- ログインしていれば閲覧可能
  );

-- 2. INSERT権限 - 自分の移管申請のみ作成可能
CREATE POLICY "migration_insert_policy" 
  ON public.email_migration_logs
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() 
    AND status = 'requested'
  );

-- 3. UPDATE権限 - ログインユーザーは更新可能（管理者機能用）
CREATE POLICY "migration_update_policy" 
  ON public.email_migration_logs
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL  -- ログインしていれば更新可能（一時的）
  );

-- 確認
SELECT 'Fixed Migration RLS Policies:' as message;
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'email_migration_logs'
ORDER BY policyname;