-- ======================================
-- Row Level Security (RLS) ポリシー設定
-- ======================================

-- ======================================
-- 1. profiles テーブル RLS
-- ======================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（再作成のため）
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view family profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- ユーザーは自分のプロファイルを表示可能
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 保護者は家族内のプロファイルを表示可能
CREATE POLICY "Parents can view family profiles" ON public.profiles
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('parent', 'teacher')
    )
  );

-- ユーザーは自分のプロファイルを更新可能
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 管理者は全てのプロファイルを管理可能
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- サービスロールはプロファイルを作成可能（新規ユーザー登録時）
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- ======================================
-- 2. parent_student_relations テーブル RLS
-- ======================================
ALTER TABLE public.parent_student_relations ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（再作成のため）
DROP POLICY IF EXISTS "Parents can manage own relations" ON public.parent_student_relations;
DROP POLICY IF EXISTS "Students can view own relations" ON public.parent_student_relations;
DROP POLICY IF EXISTS "Admins can manage all relations" ON public.parent_student_relations;

-- 保護者は自分の関係を管理可能
CREATE POLICY "Parents can manage own relations" ON public.parent_student_relations
  FOR ALL USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- 生徒は自分に関連する関係を表示可能
CREATE POLICY "Students can view own relations" ON public.parent_student_relations
  FOR SELECT USING (student_id = auth.uid());

-- 管理者は全ての関係を管理可能
CREATE POLICY "Admins can manage all relations" ON public.parent_student_relations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ======================================
-- 3. email_migration_logs テーブル RLS
-- ======================================
ALTER TABLE public.email_migration_logs ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（再作成のため）
DROP POLICY IF EXISTS "Users can view own migration logs" ON public.email_migration_logs;
DROP POLICY IF EXISTS "Users can create migration requests" ON public.email_migration_logs;
DROP POLICY IF EXISTS "Admins can manage all migration logs" ON public.email_migration_logs;

-- ユーザーは自分の移管ログを表示可能
CREATE POLICY "Users can view own migration logs" ON public.email_migration_logs
  FOR SELECT USING (user_id = auth.uid());

-- ユーザーは移管申請を作成可能
CREATE POLICY "Users can create migration requests" ON public.email_migration_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    AND status = 'requested'
  );

-- 管理者は全ての移管ログを管理可能
CREATE POLICY "Admins can manage all migration logs" ON public.email_migration_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ======================================
-- 4. audit_logs テーブル RLS
-- ======================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（再作成のため）
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

-- ユーザーは自分の監査ログを表示可能
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- システムは監査ログを作成可能
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- 管理者は全ての監査ログを表示可能
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );