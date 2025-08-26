# 04. ダッシュボード実装

## 概要
認証状態の確認・検証を目的とした最小限のダッシュボードを実装します。役割別（保護者・生徒・管理者）に適切な情報を表示します。

## 優先度
🔥 **高** - 認証機能の動作確認に必須

## 見積もり工数
**10時間**（2.5日間）

## 前提条件
- 認証機能が実装されている
- データベース設計が完了している
- 適切な RLS ポリシーが設定されている

## Todo リスト

### ダッシュボード基盤
- [ ] app/(auth)/dashboard/layout.tsx 作成（共通レイアウト）
- [ ] app/(auth)/dashboard/page.tsx 作成（メインダッシュボード）
- [ ] ナビゲーションコンポーネント作成
- [ ] 役割別表示制御実装

### Server Components 実装
- [ ] components/server/UserProfile.tsx 作成
- [ ] components/server/SessionInfo.tsx 作成
- [ ] components/server/FamilyInfo.tsx 作成（保護者のみ）
- [ ] components/server/StudentList.tsx 作成（保護者のみ）

### Client Components 実装
- [ ] components/client/LogoutButton.tsx 作成
- [ ] components/client/StudentForm.tsx 作成（生徒追加フォーム）
- [ ] components/client/ProfileEditForm.tsx 作成

### 役割別ページ実装
- [ ] app/(auth)/dashboard/parent/page.tsx 作成（保護者専用）
- [ ] app/(auth)/dashboard/student/page.tsx 作成（生徒専用）
- [ ] app/(admin)/dashboard/page.tsx 作成（管理者専用）

### 生徒管理機能
- [ ] 生徒アカウント追加機能
- [ ] 生徒ログイン情報表示
- [ ] 生徒アカウント編集機能

### データ取得・表示
- [ ] ユーザー情報取得
- [ ] セッション情報表示
- [ ] 家族構成表示
- [ ] 最終ログイン時間表示

## 実装内容

### 1. メインダッシュボードレイアウト

#### app/(auth)/dashboard/layout.tsx
```typescript
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/server/Navigation'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザープロファイル取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} profile={profile} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
```

#### app/(auth)/dashboard/page.tsx
```typescript
import { createClient } from '@/lib/supabase/server'
import { UserProfile } from '@/components/server/UserProfile'
import { SessionInfo } from '@/components/server/SessionInfo'
import { FamilyInfo } from '@/components/server/FamilyInfo'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return <div>プロファイル情報が見つかりません</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ダッシュボード
          </h1>
          <p className="text-gray-600">
            studyspark-auth-test 認証検証システム
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<div>読み込み中...</div>}>
          <UserProfile user={user} profile={profile} />
        </Suspense>
        
        <Suspense fallback={<div>読み込み中...</div>}>
          <SessionInfo user={user} />
        </Suspense>
      </div>

      {profile.role === 'parent' && (
        <Suspense fallback={<div>家族情報を読み込み中...</div>}>
          <FamilyInfo familyId={profile.family_id} />
        </Suspense>
      )}

      {profile.role === 'student' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900">生徒アカウント</h3>
          <p className="text-blue-700 mt-2">
            ログインID: <span className="font-mono">{profile.login_id}</span>
          </p>
        </div>
      )}
    </div>
  )
}
```

### 2. Server Components 実装

#### components/server/UserProfile.tsx
```typescript
import { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface UserProfileProps {
  user: User
  profile: Profile
}

export function UserProfile({ user, profile }: UserProfileProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          ユーザー情報
        </h2>
        
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">表示名</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {profile.display_name || '未設定'}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">役割</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                profile.role === 'admin' ? 'bg-red-100 text-red-800' :
                profile.role === 'parent' ? 'bg-blue-100 text-blue-800' :
                profile.role === 'teacher' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {profile.role === 'admin' ? '管理者' :
                 profile.role === 'parent' ? '保護者' :
                 profile.role === 'teacher' ? '指導者' : '生徒'}
              </span>
            </dd>
          </div>

          {user.email && (
            <div>
              <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {user.email}
              </dd>
            </div>
          )}

          {profile.login_id && (
            <div>
              <dt className="text-sm font-medium text-gray-500">ログインID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {profile.login_id}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-gray-500">家族ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">
              {profile.family_id}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">ユーザーID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono text-xs">
              {user.id}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
```

#### components/server/SessionInfo.tsx
```typescript
import { User } from '@supabase/supabase-js'
import { LogoutButton } from '@/components/client/LogoutButton'

interface SessionInfoProps {
  user: User
}

export function SessionInfo({ user }: SessionInfoProps) {
  const createdAt = new Date(user.created_at!)
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          セッション情報
        </h2>
        
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">アカウント作成日</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {createdAt.toLocaleString('ja-JP')}
            </dd>
          </div>

          {lastSignIn && (
            <div>
              <dt className="text-sm font-medium text-gray-500">最終ログイン</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {lastSignIn.toLocaleString('ja-JP')}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-gray-500">メール確認</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.email_confirmed_at ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user.email_confirmed_at ? '確認済み' : '未確認'}
              </span>
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
```

#### components/server/FamilyInfo.tsx
```typescript
import { createClient } from '@/lib/supabase/server'
import { StudentForm } from '@/components/client/StudentForm'

interface FamilyInfoProps {
  familyId: string
}

export async function FamilyInfo({ familyId }: FamilyInfoProps) {
  const supabase = createClient()
  
  // 家族内の生徒を取得
  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('family_id', familyId)
    .eq('role', 'student')
    .order('created_at', { ascending: true })

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          家族構成
        </h2>
        
        {students && students.length > 0 ? (
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {student.last_name} {student.first_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    ログインID: <span className="font-mono">{student.login_id}</span>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  生徒
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            まだ生徒が登録されていません
          </p>
        )}

        <div className="mt-6">
          <StudentForm />
        </div>
      </div>
    </div>
  )
}
```

### 3. Client Components 実装

#### components/client/LogoutButton.tsx
```typescript
'use client'

import { signOut } from '@/lib/auth/actions'
import { useTransition } from 'react'

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
    >
      {isPending ? 'ログアウト中...' : 'ログアウト'}
    </button>
  )
}
```

#### components/client/StudentForm.tsx
```typescript
'use client'

import { useState, useTransition } from 'react'
import { createStudentAccount } from '@/lib/auth/actions'

export function StudentForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null)
      setSuccess(null)
      
      const result = await createStudentAccount(formData)
      
      if (result.error) {
        setError(result.error)
      } else if (result.success) {
        setSuccess(result.message || '生徒アカウントを作成しました')
        setIsOpen(false)
        // フォームリセット
        ;(document.getElementById('studentForm') as HTMLFormElement)?.reset()
      }
    })
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        生徒を追加
      </button>
    )
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="text-lg font-medium text-gray-900 mb-4">生徒アカウント追加</h3>
      
      <form id="studentForm" action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="loginId" className="block text-sm font-medium text-gray-700">
              ログインID
            </label>
            <input
              type="text"
              id="loginId"
              name="loginId"
              placeholder="たろう2015"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">ひらがな + 数字で入力してください</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              パスワード
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              姓
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              名
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="lastNameKana" className="block text-sm font-medium text-gray-700">
              姓（かな）
            </label>
            <input
              type="text"
              id="lastNameKana"
              name="lastNameKana"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="firstNameKana" className="block text-sm font-medium text-gray-700">
              名（かな）
            </label>
            <input
              type="text"
              id="firstNameKana"
              name="firstNameKana"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        {success && (
          <div className="text-green-600 text-sm">{success}</div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isPending ? '作成中...' : '作成'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

## 受け入れ基準
- [ ] 役割別に適切な情報が表示される
- [ ] ユーザー情報・セッション情報が正確に表示される
- [ ] 保護者は家族内の生徒一覧を確認できる
- [ ] 生徒アカウントの追加が正常に動作する
- [ ] ログアウト機能が正常に動作する
- [ ] Server Components/Client Components が適切に使い分けられている
- [ ] レスポンシブデザインが実装されている
- [ ] アクセシビリティに配慮されている

## デザイン考慮事項
- シンプルで直感的なUI
- 情報の視覚的階層の明確化
- 適切な色分けとアイコンの使用
- モバイルフレンドリーなレスポンシブデザイン

## 関連チケット
- [03-authentication-features.md](./03-authentication-features.md) - 認証機能実装
- [05-email-migration.md](./05-email-migration.md) - メール移管機能

## 注意点
- Server Components を最大限活用
- データ取得は Server Components で実行
- 適切なローディング状態の表示
- エラーハンドリングの徹底