-- 無限再帰を解決するためのRLSポリシー修正
-- profilesテーブル内で自己参照を避ける

-- まず全てのポリシーを削除
DROP POLICY IF EXISTS "profile_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profile_insert_policy" ON public.profiles;

-- シンプルで再帰のないポリシーを作成

-- 1. SELECT権限 - 再帰なし
CREATE POLICY "simple_select_policy" 
  ON public.profiles
  FOR SELECT 
  USING (
    -- 常にtrue（全員が全プロファイルを閲覧可能）
    -- より細かい制御が必要な場合は後で調整
    auth.uid() = id  -- 自分のプロファイル
    OR 
    auth.uid() IS NOT NULL  -- ログインしていれば他のプロファイルも見れる（一時的）
  );

-- 2. UPDATE権限 - シンプル
CREATE POLICY "simple_update_policy" 
  ON public.profiles
  FOR UPDATE 
  USING (
    auth.uid() = id  -- 自分のプロファイルのみ更新可能
  );

-- 3. INSERT権限 - シンプル
CREATE POLICY "simple_insert_policy" 
  ON public.profiles
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id  -- 自分のプロファイルのみ作成可能
  );

-- 確認
SELECT 'Fixed RLS Policies:' as message;
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;