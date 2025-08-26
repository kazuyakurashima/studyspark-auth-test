# 03. 認証機能実装

## 概要
保護者・指導者・生徒向けの認証機能を実装します。Next.js App RouterとSupabase Authを活用したモダンな認証システムです。

## 優先度
🔥 **高** - システムのコア機能

## 見積もり工数
**12時間**（3日間）

## 前提条件
- 認証基盤セットアップが完了している
- データベース設計が完了している
- Supabase プロジェクトが設定されている

## Todo リスト

### Server Actions 実装
- [ ] lib/auth/actions.ts ファイル作成
- [ ] 保護者ログイン機能実装
- [ ] 保護者新規登録機能実装
- [ ] 生徒ログイン機能実装（仮想メールアドレス方式）
- [ ] パスワードリセット機能実装
- [ ] ログアウト機能実装

### Route Handlers 実装
- [ ] app/api/auth/callback/route.ts 作成（認証コールバック）
- [ ] app/api/auth/signout/route.ts 作成（サインアウト）
- [ ] app/api/auth/confirm/route.ts 作成（メール確認）

### 認証ページ実装
- [ ] app/(public)/login/page.tsx 作成
- [ ] app/(public)/register/page.tsx 作成
- [ ] app/(public)/reset-password/page.tsx 作成
- [ ] app/(public)/student-login/page.tsx 作成

### クライアントコンポーネント実装
- [ ] components/client/LoginForm.tsx 作成
- [ ] components/client/RegisterForm.tsx 作成
- [ ] components/client/StudentLoginForm.tsx 作成
- [ ] components/client/LogoutButton.tsx 作成

### 認証ガード実装
- [ ] app/(auth)/layout.tsx 作成（認証必須レイアウト）
- [ ] ミドルウェア実装
- [ ] 役割ベースアクセス制御実装

### エラーハンドリング
- [ ] app/error.tsx 作成
- [ ] app/not-found.tsx 作成
- [ ] 認証エラー専用ページ作成

## 実装内容

### 1. Server Actions 実装

#### lib/auth/actions.ts
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

// 保護者新規登録
export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string
  
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      data: {
        display_name: displayName,
        role: 'parent'
      }
    },
  })

  if (error) {
    return { error: error.message }
  }

  // プロファイル作成
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        display_name: displayName,
        role: 'parent'
      })
    
    if (profileError) {
      return { error: 'プロファイル作成に失敗しました' }
    }
  }

  return { success: true, message: '確認メールを送信しました' }
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

// パスワードリセット
export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string
  
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/confirm`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'パスワードリセット用のメールを送信しました' }
}

// ログアウト
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
```

### 2. Route Handlers 実装

#### app/api/auth/callback/route.ts
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // エラーが発生した場合
  return NextResponse.redirect(`${origin}/auth-error`)
}
```

### 3. 認証ページ実装

#### app/(public)/login/page.tsx
```typescript
import { LoginForm } from '@/components/client/LoginForm'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            アカウントにログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            保護者・指導者の方はこちら
          </p>
        </div>
        
        <LoginForm />
        
        <div className="text-center space-y-2">
          <Link
            href="/register"
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            新規アカウント作成
          </Link>
          <br />
          <Link
            href="/student-login"
            className="text-gray-600 hover:text-gray-500 text-sm"
          >
            生徒の方はこちら
          </Link>
        </div>
      </div>
    </div>
  )
}
```

### 4. クライアントコンポーネント実装

#### components/client/LoginForm.tsx
```typescript
'use client'

import { useState, useTransition } from 'react'
import { signIn } from '@/lib/auth/actions'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null)
      const result = await signIn(formData)
      
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-6">
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <label htmlFor="email" className="sr-only">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="メールアドレス"
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            placeholder="パスワード"
          />
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isPending ? 'ログイン中...' : 'ログイン'}
        </button>
      </div>
    </form>
  )
}
```

### 5. 認証ガード実装

#### app/(auth)/layout.tsx
```typescript
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

### 6. 型定義

#### types/auth.ts
```typescript
export interface User {
  id: string
  email?: string
  role: 'admin' | 'parent' | 'teacher' | 'student'
  display_name?: string
  family_id: string
  login_id?: string // 生徒の場合のみ
}

export interface AuthError {
  message: string
  status?: number
}

export interface AuthResult {
  success?: boolean
  error?: string
  message?: string
  user?: User
}

export interface StudentLoginData {
  loginId: string
  password: string
}

export interface ParentLoginData {
  email: string
  password: string
}
```

## 受け入れ基準
- [ ] 保護者・指導者のメール/パスワード認証が動作する
- [ ] 生徒のログインID/パスワード認証が動作する
- [ ] 新規登録後にメール確認が送信される
- [ ] パスワードリセット機能が動作する
- [ ] 認証ガードが適切に機能する
- [ ] セッション管理が正常に動作する
- [ ] エラーハンドリングが適切に実装されている
- [ ] TypeScript エラーが発生しない

## セキュリティ考慮事項
- パスワードの適切な複雑性チェック
- Rate limiting の実装検討
- CSRF 対策（Supabase Auth Helpers による自動保護）
- セッション固定攻撃対策
- 適切なリダイレクト URL 検証

## 関連チケット
- [02-database-design.md](./02-database-design.md) - データベース設計
- [04-dashboard-implementation.md](./04-dashboard-implementation.md) - ダッシュボード実装
- [05-email-migration.md](./05-email-migration.md) - メール移管機能

## 注意点
- Progressive Enhancement を意識した実装
- Server Components First の原則遵守
- 適切なエラーメッセージの表示
- アクセシビリティの考慮