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
  - Supabase Auth（保護者・指導者用）
  - @supabase/auth-helpers-nextjs（公式ヘルパー）
  - カスタム認証（生徒用 - Supabase Auth拡張）
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
│   │   └── migration/
│   │       └── page.tsx           # Server Component
│   ├── (public)/                  # 認証不要なルートグループ
│   │   ├── login/
│   │   │   └── page.tsx           # Server Component + Client Form
│   │   └── register/
│   │       └── page.tsx           # Server Component + Client Form
│   ├── api/
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── route.ts       # Route Handler（認証コールバック）
│   │   │   └── signout/
│   │   │       └── route.ts       # Route Handler（サインアウト）
│   │   └── migration/
│   │       └── route.ts           # Route Handler（移管API）
│   ├── layout.tsx                 # Root Layout（Provider設定）
│   └── page.tsx                    # Home Page
├── components/
│   ├── server/                    # Server Components
│   │   ├── AuthStatus.tsx
│   │   └── UserProfile.tsx
│   └── client/                    # Client Components
│       ├── LoginForm.tsx          # "use client"
│       └── LogoutButton.tsx       # "use client"
├── lib/
│   ├── supabase/
│   │   ├── server.ts              # Server-side Supabaseクライアント
│   │   ├── client.ts              # Client-side Supabaseクライアント
│   │   └── middleware.ts          # ミドルウェア用ヘルパー
│   └── auth/
│       └── actions.ts             # Server Actions
└── middleware.ts                   # 最小限のミドルウェア
```

## 実装する主要機能

### 1. 認証機能（App Router準拠）

#### 保護者・指導者認証
| 機能 | 実装方法 | コンポーネント種別 |
|------|----------|------------------|
| ログインフォーム | Server Actions | Client Component |
| メール確認 | Route Handler | Server |
| パスワードリセット | Server Actions | Client Component |
| セッション管理 | Cookies | Server |
| ログアウト | Server Actions | Client Component |

#### 生徒認証（カスタム実装）
- ログインID（ひらがな+数字）を仮想メールアドレスに変換
- 例: "たろう2015" → "たろう2015@studyspark.local"
- Supabase Authの仕組みを活用しつつ、生徒向けUIを提供
- 簡易パスワード（4文字以上）
- 保護者による再設定機能

### 2. アカウント管理

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

### 3. 検証用ダッシュボード

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
  redirect('/student/dashboard')
}
```

## データベース設計

### 主要テーブル

#### public.profiles
```sql
CREATE TABLE profiles (
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

### Row Level Security (RLS)
- ユーザーは自分のプロファイルのみ閲覧可能
- 保護者は家族内の情報を管理可能
- 管理者は移管処理を承認可能

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

## デプロイメント

### Vercel デプロイ
- 環境変数の設定
- Supabase URLとキーの設定
- カスタムドメインの設定（本番環境）

### 環境変数
```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
```