-- 現在のRLSポリシーを確認
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- すべての既存ポリシーを削除
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view students in their family" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view family students" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Parents can update family students" ON public.profiles;

-- 統合されたRLSポリシーを作成（重複なし）

-- 1. SELECT権限 - 統合ポリシー
CREATE POLICY "profile_select_policy" 
  ON public.profiles
  FOR SELECT 
  USING (
    -- 自分のプロファイル
    auth.uid() = id
    OR
    -- 管理者は全て閲覧可能
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- 保護者は同じfamily_idの生徒を閲覧可能
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = profiles.family_id
      AND profiles.role = 'student'
    )
  );

-- 2. UPDATE権限 - 統合ポリシー
CREATE POLICY "profile_update_policy" 
  ON public.profiles
  FOR UPDATE 
  USING (
    -- 自分のプロファイル
    auth.uid() = id
    OR
    -- 管理者は全て更新可能
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- 保護者は同じfamily_idの生徒を更新可能
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = profiles.family_id
      AND profiles.role = 'student'
    )
  );

-- 3. INSERT権限
CREATE POLICY "profile_insert_policy" 
  ON public.profiles
  FOR INSERT 
  WITH CHECK (
    -- 自分のプロファイルのみ作成可能
    auth.uid() = id
    OR
    -- 管理者は任意のプロファイルを作成可能
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 最終確認
SELECT 'RLS Policies After Fix:' as message;
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;