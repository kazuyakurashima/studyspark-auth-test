-- 安全なRLSポリシー修正
-- 既存のポリシーをすべて削除してから再作成

-- まずRLSを無効にしてポリシーをクリア
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 既存のポリシーをすべて削除（エラーを無視）
DO $$ 
BEGIN
    -- 既存のポリシーを削除（存在しない場合はエラーを無視）
    BEGIN
        DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    EXCEPTION WHEN others THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Parents can view students in their family" ON public.profiles;
    EXCEPTION WHEN others THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Parents can view family students" ON public.profiles;
    EXCEPTION WHEN others THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    EXCEPTION WHEN others THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    EXCEPTION WHEN others THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Parents can update family students" ON public.profiles;
    EXCEPTION WHEN others THEN
        NULL;
    END;
END $$;

-- RLSを再び有効にする
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 新しいポリシーを作成

-- 1. ユーザーは自分のプロファイルを閲覧可能
CREATE POLICY "profile_view_own" 
  ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- 2. 保護者は同じfamily_idの生徒プロファイルを閲覧可能
CREATE POLICY "profile_view_family_students" 
  ON public.profiles
  FOR SELECT 
  USING (
    -- 現在のユーザーが保護者で、同じfamily_idを持つ生徒を閲覧可能
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('parent', 'admin')
      AND p.family_id = profiles.family_id
      AND profiles.role = 'student'
    )
  );

-- 3. 管理者は全てのプロファイルを閲覧可能
CREATE POLICY "profile_view_admin_all" 
  ON public.profiles
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 4. ユーザーは自分のプロファイルを更新可能
CREATE POLICY "profile_update_own" 
  ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id);

-- 5. 保護者は家族内の生徒プロファイルを更新可能
CREATE POLICY "profile_update_family_students" 
  ON public.profiles
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('parent', 'admin')
      AND p.family_id = profiles.family_id
      AND profiles.role = 'student'
    )
  );

-- 6. INSERT権限（新しいプロファイル作成用）
CREATE POLICY "profile_insert_own" 
  ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 確認用クエリ
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles';