-- データ自動復活を防ぐためにトリガーを一時無効化

-- 1. 既存のプロファイル作成トリガーを無効化
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. 管理者による明示的なプロファイル作成のみ許可する関数
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  display_name TEXT DEFAULT NULL,
  role TEXT DEFAULT 'parent'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_family_id TEXT;
  profile_id UUID;
BEGIN
  -- 既にプロファイルが存在する場合はエラー
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RAISE EXCEPTION 'Profile already exists for user %', user_id;
  END IF;
  
  -- family_id生成
  new_family_id := 'FAM-' || substr(gen_random_uuid()::text, 1, 8);
  
  -- プロファイル作成
  INSERT INTO public.profiles (
    id,
    family_id, 
    display_name,
    role
  ) VALUES (
    user_id,
    new_family_id,
    COALESCE(display_name, split_part(user_email, '@', 1)),
    role
  )
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- 3. 既存の孤立したユーザー（プロファイルなし）を確認
SELECT 
  'Orphaned Users (no profiles):' as title;

SELECT 
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;