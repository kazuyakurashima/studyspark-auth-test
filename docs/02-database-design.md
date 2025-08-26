# 02. データベース設計・実装

## 概要
Supabase PostgreSQL でのテーブル設計、作成、Row Level Security (RLS) ポリシーの設定を行います。

## 優先度
🔥 **高** - 認証機能の基盤となるデータ構造

## 見積もり工数
**6時間**（1.5日間）

## 前提条件
- Supabase プロジェクトが作成されている
- 認証基盤セットアップが完了している
- SQL エディタアクセス権限がある

## Todo リスト

### テーブル設計・作成
- [ ] auth.users テーブル確認・カスタマイズ
- [ ] public.profiles テーブル作成
- [ ] public.parent_student_relations テーブル作成
- [ ] public.email_migration_logs テーブル作成
- [ ] public.audit_logs テーブル作成

### インデックス作成
- [ ] profiles テーブルインデックス作成
- [ ] parent_student_relations テーブルインデックス作成
- [ ] email_migration_logs テーブルインデックス作成
- [ ] パフォーマンス用インデックス作成

### Row Level Security (RLS) 設定
- [ ] profiles テーブル RLS ポリシー作成
- [ ] parent_student_relations テーブル RLS ポリシー作成
- [ ] email_migration_logs テーブル RLS ポリシー作成
- [ ] audit_logs テーブル RLS ポリシー作成

### 関数・トリガー作成
- [ ] 家族ID自動生成関数作成
- [ ] 更新日時自動更新トリガー作成
- [ ] 生徒アカウント作成関数作成（Supabase Admin API用）

## 実装内容

### 1. public.profiles テーブル

```sql
CREATE TABLE public.profiles (
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
CREATE INDEX idx_profiles_family_id ON public.profiles(family_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE UNIQUE INDEX idx_profiles_login_id ON public.profiles(login_id) WHERE login_id IS NOT NULL;
```

### 2. public.parent_student_relations テーブル

```sql
CREATE TABLE public.parent_student_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'parent' CHECK (relation_type IN ('parent', 'guardian', 'teacher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(parent_id, student_id)
);

-- インデックス作成
CREATE INDEX idx_parent_student_parent_id ON public.parent_student_relations(parent_id);
CREATE INDEX idx_parent_student_student_id ON public.parent_student_relations(student_id);
```

### 3. public.email_migration_logs テーブル

```sql
CREATE TABLE public.email_migration_logs (
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
CREATE INDEX idx_migration_logs_user_id ON public.email_migration_logs(user_id);
CREATE INDEX idx_migration_logs_status ON public.email_migration_logs(status);
CREATE INDEX idx_migration_logs_requested_at ON public.email_migration_logs(requested_at);
```

### 4. public.audit_logs テーブル

```sql
CREATE TABLE public.audit_logs (
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
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_details ON public.audit_logs USING GIN(details);
```

### 5. Row Level Security (RLS) ポリシー

#### profiles テーブル
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロファイルを表示可能
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 保護者は家族内のプロファイルを表示可能
CREATE POLICY "Parents can view family profiles" ON public.profiles
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ユーザーは自分のプロファイルを更新可能
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 管理者は全てのプロファイルを管理可能
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### parent_student_relations テーブル
```sql
ALTER TABLE public.parent_student_relations ENABLE ROW LEVEL SECURITY;

-- 保護者は自分の関係を管理可能
CREATE POLICY "Parents can manage own relations" ON public.parent_student_relations
  FOR ALL USING (parent_id = auth.uid());

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
```

#### email_migration_logs テーブル
```sql
ALTER TABLE public.email_migration_logs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の移管ログを表示可能
CREATE POLICY "Users can view own migration logs" ON public.email_migration_logs
  FOR SELECT USING (user_id = auth.uid());

-- ユーザーは移管申請を作成可能
CREATE POLICY "Users can create migration requests" ON public.email_migration_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 管理者は全ての移管ログを管理可能
CREATE POLICY "Admins can manage all migration logs" ON public.email_migration_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 6. 関数・トリガー

#### 更新日時自動更新関数・トリガー
```sql
-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- profiles テーブルトリガー
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 生徒アカウント作成関数
```sql
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
```

## 受け入れ基準
- [ ] 全てのテーブルが正常に作成される
- [ ] インデックスが適切に設定される
- [ ] RLS ポリシーが正しく動作する
- [ ] トリガーが正常に機能する
- [ ] パフォーマンステストでクエリ速度が許容範囲内
- [ ] Supabase ダッシュボードで確認可能

## セキュリティ考慮事項
- 全テーブルで RLS を有効化
- 適切な権限分離の実施
- 機密データの暗号化（必要に応じて）
- 監査ログの適切な記録

## パフォーマンス考慮事項
- 頻繁にアクセスされるカラムへのインデックス作成
- JSONB カラムでの GIN インデックス使用
- 適切な外部キー制約の設定

## 関連チケット
- [01-authentication-setup.md](./01-authentication-setup.md) - 認証基盤セットアップ
- [03-authentication-features.md](./03-authentication-features.md) - 認証機能実装

## 注意点
- テーブル作成前に必ずバックアップを取得
- 本番環境では段階的にマイグレーション実行
- RLS ポリシーのテストを十分に実施
- インデックス作成によるパフォーマンス影響を監視