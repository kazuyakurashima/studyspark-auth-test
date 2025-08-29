-- 現在のユーザーを管理者に設定（開発用）
-- 最も最近作成されたparentロールのユーザーを管理者に昇格

UPDATE public.profiles 
SET role = 'admin', updated_at = NOW()
WHERE id = (
  SELECT p.id FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.role = 'parent'
  ORDER BY u.created_at DESC 
  LIMIT 1
);

-- 管理者ユーザー確認
SELECT 
  u.email,
  p.display_name,
  p.role,
  p.family_id,
  p.updated_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE p.role = 'admin';