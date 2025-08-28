-- ======================================
-- RLS無限再帰問題の修正
-- ======================================

-- 1. 既存のprofilesテーブルのRLSポリシーを全て削除
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view family profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- 2. シンプルで安全なRLSポリシーを再作成

-- ユーザーは自分のプロファイルを表示可能（無限再帰を回避）
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- ユーザーは自分のプロファイルを挿入可能
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ユーザーは自分のプロファイルを更新可能
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 管理者は全てのプロファイルを管理可能（シンプル版）
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- サービスロール（システム）は全権限
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL TO service_role USING (true)
  WITH CHECK (true);

-- 3. 家族情報アクセス用の別のポリシー（後で追加する場合）
-- この時点では無限再帰を避けるため、家族ベースのアクセスは無効化

-- 4. トリガー関数をセキュリティ定義者として実行するように修正
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER  -- これによりRLSをバイパス
LANGUAGE plpgsql
AS $$
DECLARE
  generated_family_id TEXT;
BEGIN
  -- family_idを生成
  generated_family_id := 'FAM-' || substr(gen_random_uuid()::text, 1, 8);
  
  -- RLSを一時的に無効化してプロファイルを作成
  SET LOCAL row_security = off;
  
  INSERT INTO public.profiles (
    id, 
    family_id,
    display_name, 
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    generated_family_id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name', 
      split_part(NEW.email, '@', 1),
      'ユーザー'
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログを出力するが、ユーザー作成は続行
    RAISE LOG 'Profile creation error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 5. 既存ユーザーのプロファイル作成（RLS無効化して実行）
DO $$
BEGIN
  -- RLSを一時的に無効化
  SET LOCAL row_security = off;
  
  INSERT INTO public.profiles (id, display_name, role)
  SELECT 
    id,
    COALESCE(raw_user_meta_data->>'display_name', email, 'ユーザー'),
    COALESCE(raw_user_meta_data->>'role', 'parent')
  FROM auth.users
  WHERE id NOT IN (SELECT id FROM public.profiles)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- 6. 確認クエリ
SELECT 
  u.id,
  u.email,
  p.family_id,
  p.display_name,
  p.role,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;