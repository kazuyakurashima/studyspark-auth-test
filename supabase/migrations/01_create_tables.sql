-- ======================================
-- 1. public.profiles テーブル
-- ======================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id TEXT UNIQUE NOT NULL DEFAULT 'FAM-' || substr(gen_random_uuid()::text, 1, 8),
  display_name TEXT,
  avatar_id TEXT,
  role TEXT CHECK (role IN ('admin', 'parent', 'teacher', 'student')) NOT NULL,
  -- 生徒の場合のみ使用
  login_id TEXT UNIQUE,
  last_name TEXT,
  first_name TEXT,
  last_name_kana TEXT,
  first_name_kana TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON public.profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_login_id ON public.profiles(login_id) WHERE login_id IS NOT NULL;

-- ======================================
-- 2. public.parent_student_relations テーブル
-- ======================================
CREATE TABLE IF NOT EXISTS public.parent_student_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'parent' CHECK (relation_type IN ('parent', 'guardian', 'teacher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(parent_id, student_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_parent_student_parent_id ON public.parent_student_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student_id ON public.parent_student_relations(student_id);

-- ======================================
-- 3. public.email_migration_logs テーブル
-- ======================================
CREATE TABLE IF NOT EXISTS public.email_migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  status TEXT CHECK (status IN ('requested', 'approved', 'completed', 'failed')) NOT NULL DEFAULT 'requested',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_migration_logs_user_id ON public.email_migration_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_status ON public.email_migration_logs(status);
CREATE INDEX IF NOT EXISTS idx_migration_logs_requested_at ON public.email_migration_logs(requested_at);

-- ======================================
-- 4. public.audit_logs テーブル
-- ======================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON public.audit_logs USING GIN(details);

-- ======================================
-- 5. 更新日時自動更新関数・トリガー
-- ======================================
-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- profiles テーブルトリガー
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================
-- 6. 生徒アカウント作成関数
-- ======================================
CREATE OR REPLACE FUNCTION public.create_student_account(
  p_parent_id UUID,
  p_login_id TEXT,
  p_password TEXT,
  p_last_name TEXT,
  p_first_name TEXT,
  p_last_name_kana TEXT,
  p_first_name_kana TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_virtual_email TEXT;
  v_student_id UUID;
  v_family_id TEXT;
  v_result JSON;
BEGIN
  -- 仮想メールアドレス生成
  v_virtual_email := p_login_id || '@studyspark.local';
  
  -- 親の家族IDを取得
  SELECT family_id INTO v_family_id
  FROM public.profiles
  WHERE id = p_parent_id;
  
  IF v_family_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', '保護者の家族IDが見つかりません'
    );
  END IF;
  
  -- 重複チェック
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE login_id = p_login_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'このログインIDは既に使用されています'
    );
  END IF;
  
  -- この関数では準備のみ。実際のユーザー作成はSupabase Admin APIで実行
  RETURN json_build_object(
    'success', true,
    'virtual_email', v_virtual_email,
    'family_id', v_family_id,
    'message', '生徒アカウント作成の準備が完了しました'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;