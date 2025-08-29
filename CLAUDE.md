# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

### studyspark-auth-test - ログイン認証検証システム
StudySparkアプリケーションの認証システムのみを独立して実装・検証するプロジェクトです。

**重要**: 本プロジェクトは認証機能の検証のみが目的です。学習記録機能（スパーク）、目標管理機能（ゴールナビ）、振り返り機能（リフレクト）などのStudySpark本体機能は実装しません。

### 設計原則
- **Server Components First**: 可能な限りServer Componentsを使用
- **Progressive Enhancement**: JavaScriptが無効でも基本機能は動作
- **Type Safety**: TypeScriptによる完全な型安全性
- **Security by Default**: Supabase Auth Helpersのセキュリティ機能を最大限活用

### 主要な検証項目
- Next.js App RouterとSupabase Auth Helpersのベストプラクティスに準拠した実装
- Gmailエイリアス機能を活用した初期運用の実現性検証
- 保護者メールアドレスへの段階的移管プロセスの確立
- ハイブリッド認証（メール/ID）システムの技術検証
- データ引き継ぎの完全性確認

## 開発コマンド

```bash
npm run dev     # 開発サーバー起動 (http://localhost:3000)
npm run build   # プロダクションビルド
npm run start   # プロダクションサーバー起動
npm run lint    # ESLint実行
```

## 技術スタック

### フロントエンド
- **Framework**: Next.js 14.2.x (App Router)
- **UI Library**: React 18.3.x
- **Language**: TypeScript 5.5.x (strict mode)
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion（Client Componentsのみ）

### バックエンド・認証
- **Database**: Supabase (PostgreSQL)
- **Authentication**: 
  - Supabase Auth（保護者・指導者・管理者用）
  - @supabase/ssr（最新の公式SSRライブラリ）
  - カスタム認証（生徒用 - 仮想メールアドレス方式）
- **Session Management**: 
  - Cookieベース（httpOnly, secure, sameSite）
  - Server-side認証状態管理
- **API**: Route Handlers（/app/api/**/route.ts）

### 開発環境
- **Node.js**: 20.x LTS
- **Package Manager**: pnpm（推奨）or npm
- **Version Control**: Git
- **Deployment**: Vercel
- **Environment Variables**: .env.local

## App Router アーキテクチャ

### ディレクトリ構造
```
studyspark-auth-test/
├── app/
│   ├── (auth)/                    # 認証が必要なルートグループ
│   │   ├── dashboard/
│   │   │   ├── layout.tsx         # Server Component（認証チェック）
│   │   │   └── page.tsx           # Server Component（データ取得）
│   │   ├── migration/
│   │   │   └── page.tsx           # Server Component（移管申請）
│   │   ├── students/
│   │   │   └── add/
│   │   │       └── page.tsx       # Server Component（生徒追加）
│   │   └── admin/
│   │       └── migration/
│   │           └── page.tsx       # Server Component（管理者用移管管理）
│   ├── (public)/                  # 認証不要なルートグループ
│   │   ├── login/
│   │   │   └── page.tsx           # Server Component + Client Form
│   │   ├── register/
│   │   │   └── page.tsx           # Server Component + Client Form
│   │   ├── student-login/
│   │   │   └── page.tsx           # Server Component（生徒ログイン）
│   │   └── reset-password/
│   │       └── page.tsx           # Server Component（パスワードリセット）
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts       # Route Handler（認証コールバック）
│   │   └── migration/
│   │       └── execute/
│   │           └── route.ts       # Route Handler（移管実行API）
│   ├── error.tsx                  # エラーバウンダリ
│   ├── not-found.tsx              # 404ページ
│   ├── layout.tsx                 # Root Layout（Provider設定）
│   └── page.tsx                    # Home Page
├── components/
│   ├── server/                    # Server Components
│   │   ├── Navigation.tsx
│   │   ├── UserProfile.tsx
│   │   ├── SessionInfo.tsx
│   │   ├── FamilyInfo.tsx
│   │   ├── MigrationStatus.tsx
│   │   └── MigrationAdminPanel.tsx
│   └── client/                    # Client Components
│       ├── LoginForm.tsx          # "use client"
│       ├── RegisterForm.tsx
│       ├── StudentLoginForm.tsx
│       ├── StudentForm.tsx        # インライン生徒追加
│       ├── StudentAddForm.tsx     # 専用ページ生徒追加
│       ├── LogoutButton.tsx
│       ├── LogoutButtonSmall.tsx
│       ├── MigrationRequestForm.tsx
│       └── MigrationActionButtons.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts              # Server-side Supabaseクライアント
│   │   ├── client.ts              # Client-side Supabaseクライアント
│   │   ├── admin.ts               # Supabase Admin API ユーティリティ
│   │   └── middleware.ts          # ミドルウェア用ヘルパー
│   └── auth/
│       ├── actions.ts             # Server Actions（認証）
│       └── migration.ts           # Server Actions（移管）
├── types/
│   ├── auth.ts                    # 認証関連の型定義
│   └── supabase.ts               # Supabase型定義
└── middleware.ts                   # 最小限のミドルウェア
```

## 実装済み主要機能

### 1. 認証機能（App Router準拠） ✅実装済み

#### 保護者・指導者認証
| 機能 | 実装方法 | コンポーネント種別 |
|------|----------|------------------|
| ログインフォーム | Server Actions | Client Component |
| メール確認 | Route Handler | Server |
| パスワードリセット | Server Actions | Client Component |
| セッション管理 | Cookies | Server |
| ログアウト | Server Actions | Client Component |

#### 生徒認証（カスタム実装）
- ログインID（英数字のみ）を仮想メールアドレスに変換
- 例: "taro2015" → "taro2015@studyspark.local"
- Supabase Authの仕組みを活用しつつ、生徒向けUIを提供
- 簡易パスワード（4文字以上）
- 保護者による生徒アカウント作成・管理機能

### 2. アカウント管理 ✅実装済み

#### 初期登録フロー
1. 保護者アカウント作成（エイリアス or 実メール）
2. 家族ID自動生成（FAM-XXXXX形式）
3. 生徒アカウント追加（任意）

#### メールアドレス移管機能
1. 移管申請（保護者）
2. 本人確認（管理者）
3. 移管承認（管理者）
4. メールアドレス更新（システム）
5. 新メール確認（保護者）
6. データ引き継ぎ確認（システム）

### 3. 検証用ダッシュボード ✅実装済み

最小限の情報表示：
- ユーザー情報（ID、メール/ログインID、役割、家族ID）
- セッション情報（アクティブ状態、有効期限）
- 家族構成（保護者のみ）
- 移管ステータス

## Supabase Client 初期化パターン

### Server Component用（lib/supabase/server.ts）
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Server Component内でのcookie設定エラーを処理
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // エラー処理
          }
        },
      },
    }
  )
}
```

### Client Component用（lib/supabase/client.ts）
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

## Server Actions パターン

### 認証アクション（lib/auth/actions.ts）
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// 保護者ログイン
export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// 生徒ログイン
export async function signInStudent(formData: FormData) {
  const loginId = formData.get('loginId') as string
  const password = formData.get('password') as string
  
  // loginIdを仮想メールアドレスに変換
  const virtualEmail = `${loginId}@studyspark.local`
  
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: virtualEmail,
    password,
  })
  
  if (error) {
    return { error: 'ログインIDまたはパスワードが間違っています' }
  }
  
  revalidatePath('/', 'layout')
  redirect('/dashboard')  // 生徒も共通のダッシュボードへ
}

// 生徒アカウント作成（保護者のみ）
export async function createStudentAccount(formData: FormData) {
  const loginId = formData.get('loginId') as string
  const password = formData.get('password') as string
  // ... 省略
  
  // loginIdのバリデーション（英数字のみ）
  const loginIdPattern = /^[a-zA-Z0-9]+$/
  if (!loginIdPattern.test(loginId)) {
    return { error: 'ログインIDは英数字のみで入力してください' }
  }
  
  // 仮想メールアドレス生成
  const virtualEmail = `${loginId}@studyspark.local`
  
  // Supabase Admin APIを使用して生徒アカウントを作成
  // ... 実装コード
}
```

## データベース設計

### 主要テーブル

#### public.profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id TEXT DEFAULT 'FAM-' || substr(gen_random_uuid()::text, 1, 8),
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
-- 注意: family_idのUNIQUE制約は削除（複数ユーザーが同じ家族に属するため）
```

#### public.parent_student_relations
```sql
CREATE TABLE parent_student_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  relation_type TEXT DEFAULT 'parent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(parent_id, student_id)
);
```

#### public.email_migration_logs
```sql
CREATE TABLE email_migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  status TEXT CHECK (status IN ('requested', 'approved', 'completed', 'failed')) NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT
);
```

#### public.audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

### Row Level Security (RLS)
- ユーザーは自分のプロファイルのみ閲覧・更新可能
- 保護者は家族内の生徒情報を管理可能
- 管理者は移管処理を承認・実行可能
- トリガー関数はSECURITY DEFINERで実行（RLSバイパス）

#### RLS設定の注意点
- 無限再帰を避けるため、管理者ポリシーは慎重に設計
- プロファイル作成時はトリガー関数でRLSを一時的に無効化
- Service Roleは全アクセス権限を持つ

## Gmailエイリアス運用

### 環境変数設定
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Gmail設定
ADMIN_EMAIL=admin@gmail.com
EMAIL_ALIAS_PREFIX=admin+
```

### テスト用エイリアス構成
```
管理者メール: admin@gmail.com

テスト用:
- admin+test001@gmail.com  # 単体テスト
- admin+test002@gmail.com  # 統合テスト
- admin+migration@gmail.com # 移管テスト

本番検証用:
- admin+family001@gmail.com # 山田家
- admin+family002@gmail.com # 鈴木家
- admin+family003@gmail.com # 田中家
```

## 追加実装機能

### 4. 生徒アカウント管理機能 ✅実装済み
- 保護者による生徒アカウント作成（/students/add）
- ログインID（英数字）による認証
- 家族ID（family_id）による関連付け
- 氏名・ふりがなの管理

### 5. メール移管管理機能 ✅実装済み
- 移管申請（/migration）
- 管理者による承認・拒否（/admin/migration）
- Supabase Admin APIによる実際のメールアドレス更新
- 監査ログの記録

### 6. ナビゲーション機能 ✅実装済み
- ロール別メニュー表示
- 保護者：生徒追加リンク
- 管理者：移管管理リンク
- ロールバッジ表示

## Supabaseマイグレーション

### 実行済みマイグレーションファイル
1. `01_create_tables.sql` - 基本テーブル作成
2. `02_row_level_security.sql` - RLS設定
3. `03_auth_triggers.sql` - 自動プロファイル作成トリガー
4. `04_fix_profiles.sql` - プロファイル修正
5. `05_fix_rls_recursion.sql` - RLS無限再帰問題の修正
6. `06_create_admin_user.sql` - 管理者ユーザー作成スクリプト

### RLS修正のポイント
```sql
-- 無限再帰を避ける最小限のポリシー
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- トリガー関数にSECURITY DEFINERを追加
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER  -- RLSをバイパス
SET search_path = public
LANGUAGE plpgsql
AS $$
-- 関数本体
$$;
```

## Route Handlers 実装

### 認証コールバック（app/api/auth/callback/route.ts）
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

## セキュリティ要件

- **パスワード**: bcryptハッシュ化（Supabase Auth標準）
- **セッション**: secure cookie (httpOnly, sameSite: strict)
- **CSRF対策**: Supabase Auth Helpers が自動的に処理
- **XSS対策**: React標準エスケープ
- **SQL Injection対策**: Supabaseクライアント使用
- **認証保護**: Layout レベルでの認証チェック

## テスト計画

### Phase 1: 開発・単体テスト（Week 1-2）
- Server Components の認証チェック
- Server Actions の動作確認
- Client Components の最小限実装
- Route Handlers のテスト

### Phase 2: 統合テスト（Week 3-4）
- 新規家族登録フロー
- 生徒アカウント作成
- パスワードリセット
- 同時ログイン

### Phase 3: 移管検証（Month 2）
- 移管申請・承認フロー
- メールアドレス更新
- データ引き継ぎ確認
- 旧エイリアス無効化

## パフォーマンス最適化

### Server Components の活用
- Suspense を使用したストリーミング
- 並列データ取得
- 部分的な再検証（revalidatePath）

### 成功指標
- Server Components 使用率: > 70%
- Client Components: 必要最小限のみ
- First Contentful Paint: < 1s
- Time to Interactive: < 2s
- Lighthouse Score: > 90

## Next.js App Router ベストプラクティス

### データ取得とレンダリング
- ✅ **Server Components First**: デフォルトで全てServer Componentsとして実装
- ✅ **静的レンダリング**: 可能な限りビルド時にページを生成
- ✅ **動的レンダリング**: 認証状態やユーザー固有データが必要な場合のみ
- ✅ **並列データ取得**: 複数のデータソースから同時取得
- ✅ **ストリーミング**: Suspenseを使用した段階的なコンテンツ配信

### ルーティングとナビゲーション
- ✅ **ルートグループ**: `(auth)`、`(public)` などでルートを論理的に分割
- ✅ **Intercepting Routes**: モーダル表示などでのUX向上
- ✅ **Parallel Routes**: 同一レイアウト内で異なるページを並列レンダリング
- ✅ **Dynamic Routes**: `[id]`、`[...slug]` の適切な使用
- ✅ **Route Handlers**: API エンドポイントは `route.ts` で実装

### キャッシュとパフォーマンス
- ✅ **Request Memoization**: 同一リクエスト内での重複排除
- ✅ **Data Cache**: `fetch()` の結果を自動キャッシュ
- ✅ **Full Route Cache**: 静的ルートのキャッシュ利用
- ✅ **Router Cache**: クライアントサイドナビゲーションの高速化
- ✅ **適切な revalidatePath/revalidateTag**: データ更新時の選択的キャッシュ無効化

### エラーハンドリングとローディング
- ✅ **Error Boundaries**: `error.tsx` でのエラー処理
- ✅ **Not Found Pages**: `not-found.tsx` でのカスタム404ページ
- ✅ **Loading States**: `loading.tsx` でのローディングUI
- ✅ **Graceful Degradation**: JavaScriptが無効でも基本機能が動作

### Client Components 最適化
- ✅ **最小限の使用**: 対話的な要素のみClient Componentsとして実装
- ✅ **境界の明確化**: `"use client"` 指定の範囲を最小化
- ✅ **状態管理**: Client Component内でのみ React hooks を使用
- ✅ **イベントハンドラ**: onClick などのイベント処理のみ

## Supabase Auth Helpers ベストプラクティス

### @supabase/ssr 使用パターン
- ✅ **Cookie-based Sessions**: localStorage ではなく Cookie でセッション管理
- ✅ **Server-side Auth**: Server Components、Server Actions、Route Handlers でのユーザー情報取得
- ✅ **Type Safety**: Supabase 型生成ツールの活用
- ✅ **環境変数管理**: `.env.local` での適切な設定

### セッション管理
- ✅ **Unified Session**: Client/Server 両方で一貫したセッション状態
- ✅ **Automatic Refresh**: トークンの自動更新機能
- ✅ **Secure Cookies**: httpOnly、secure、sameSite設定の徹底
- ✅ **CSRF Protection**: Supabase Auth Helpers による自動保護

### 認証フロー実装
- ✅ **Server Actions**: フォーム送信での認証処理
- ✅ **Route Handlers**: OAuth コールバックの適切な処理
- ✅ **Middleware**: セッション更新の最小限実装
- ✅ **Redirect**: 認証後の適切なリダイレクト処理

### セキュリティベストプラクティス
- ✅ **Row Level Security (RLS)**: Supabase テーブルレベルでのアクセス制御
- ✅ **Service Role Key 保護**: サーバーサイドでのみ使用
- ✅ **URL Validation**: コールバック URL の検証
- ✅ **Rate Limiting**: 認証エンドポイントでの適切な制限

### コード実装パターン

#### Server Component での認証チェック
```typescript
// app/(auth)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <>{children}</>
}
```

#### Server Action での認証処理
```typescript
// lib/auth/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const supabase = createClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
```

#### Client Component でのフォーム実装
```typescript
// components/client/LoginForm.tsx
'use client'

import { signIn } from '@/lib/auth/actions'

export function LoginForm() {
  return (
    <form action={signIn}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">ログイン</button>
    </form>
  )
}
```

### 非推奨パターンの回避
- ❌ `@supabase/auth-helpers-nextjs` の使用（非推奨）
- ❌ localStorage でのセッション管理
- ❌ Client Component でのデータ取得（Server Component で実施）
- ❌ 過度な `useEffect` の使用
- ❌ プロップス経由での認証状態の受け渡し

## 開発時の注意事項

1. **Server Components を優先使用**
   - データ取得はServer Componentで実施
   - Client Componentsは対話的な要素のみ

2. **Server Actions の活用**
   - フォーム送信はServer Actionsで処理
   - progressiveEnhancementを意識した実装

3. **型安全性の確保**
   - TypeScript strict mode必須
   - Supabase型生成ツールの活用

4. **エラーハンドリング**
   - error.tsxとnot-found.tsxの実装
   - Server Actionsでの適切なエラー返却

5. **コーディング規約**
   - ESLint設定の遵守
   - Prettier でのフォーマット統一

## 監視・ログ

### 監査ログ項目
- ログイン/ログアウト
- 新規登録
- パスワードリセット
- メール移管処理
- 認証エラー

### アラート設定
- ログイン失敗率 > 10%
- 移管エラー発生時
- セッションエラー > 5%
- DB接続エラー > 1%

## 環境構築手順

### 1. プロジェクトセットアップ
```bash
# リポジトリクローン
git clone https://github.com/kazuyakurashima/studyspark-auth-test.git
cd studyspark-auth-test

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.localを編集してSupabase認証情報を設定
```

### 2. Supabaseセットアップ
1. Supabaseプロジェクトを作成
2. SQL Editorで以下のマイグレーションを順番に実行：
   - `supabase/migrations/01_create_tables.sql`
   - `supabase/migrations/02_row_level_security.sql`
   - `supabase/migrations/03_auth_triggers.sql`
   - `supabase/migrations/05_fix_rls_recursion.sql`

### 3. 管理者アカウント作成
```sql
UPDATE public.profiles 
SET role = 'admin', updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@gmail.com'
);
```

### 4. 開発サーバー起動
```bash
npm run dev
# http://localhost:3000 でアクセス
```

## テスト手順

### 1. 保護者アカウントのテスト
1. `/register` - 新規登録
2. メール確認
3. `/login` - ログイン
4. `/dashboard` - ダッシュボード確認

### 2. 生徒アカウントのテスト
1. 保護者でログイン
2. `/students/add` - 生徒追加
3. ログアウト
4. `/student-login` - 生徒ログイン（英数字ID）

### 3. メール移管のテスト
1. 保護者でログイン
2. `/migration` - 移管申請
3. 管理者でログイン
4. `/admin/migration` - 申請承認・実行

### 4. 動作確認項目
- [ ] 保護者登録・ログイン
- [ ] 生徒アカウント作成
- [ ] 生徒ログイン（英数字ID）
- [ ] メール移管申請
- [ ] 管理者による承認・実行
- [ ] ロール別ナビゲーション表示
- [ ] RLSによるアクセス制御
- [ ] エラーハンドリング

## デプロイメント

### Vercel デプロイ
```bash
# Vercel CLIインストール
npm i -g vercel

# デプロイ
vercel

# 環境変数設定（Vercelダッシュボードで設定）
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
```

### 本番環境設定
- カスタムドメインの設定
- SSL証明書の自動設定
- 環境変数の本番用設定
- Supabase本番プロジェクトとの連携