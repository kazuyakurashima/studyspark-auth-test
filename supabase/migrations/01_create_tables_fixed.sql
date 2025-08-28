-- ======================================
-- 1. public.profiles テーブル（修正版）
-- family_idのUNIQUE制約を削除し、複数ユーザーが同じfamily_idを持てるように変更
-- ======================================
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL DEFAULT 'FAM-' || substr(gen_random_uuid()::text, 1, 8),
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
CREATE INDEX idx_profiles_family_id ON public.profiles(family_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE UNIQUE INDEX idx_profiles_login_id ON public.profiles(login_id) WHERE login_id IS NOT NULL;

-- 更新日時自動更新トリガーの再作成
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();