-- 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view students in their family" ON public.profiles;

-- 改善されたRLSポリシー

-- 1. ユーザーは自分のプロファイルを閲覧可能
CREATE POLICY "Users can view own profile" 
  ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- 2. 保護者は同じfamily_idの生徒プロファイルを閲覧可能
CREATE POLICY "Parents can view family students" 
  ON public.profiles
  FOR SELECT 
  USING (
    -- 現在のユーザーが保護者で、同じfamily_idを持つ生徒を閲覧可能
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = profiles.family_id
      AND profiles.role = 'student'
    )
  );

-- 3. 管理者は全てのプロファイルを閲覧可能
CREATE POLICY "Admins can view all profiles" 
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
CREATE POLICY "Users can update own profile" 
  ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id);

-- 5. 保護者は家族内の生徒プロファイルを更新可能
CREATE POLICY "Parents can update family students" 
  ON public.profiles
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = profiles.family_id
      AND profiles.role = 'student'
    )
  );