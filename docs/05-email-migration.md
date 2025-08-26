# 05. メール移管機能実装

## 概要
Gmailエイリアスから実際のメールアドレスへの段階的移管機能を実装します。保護者が安全にメールアドレスを更新できるシステムです。

## 優先度
🔥 **高** - プロジェクトの主要検証項目

## 見積もり工数
**14時間**（3.5日間）

## 前提条件
- 認証機能が実装されている
- ダッシュボードが実装されている
- email_migration_logs テーブルが作成されている
- 管理者アカウントが存在する

## Todo リスト

### 移管申請機能
- [ ] app/(auth)/migration/page.tsx 作成（移管申請ページ）
- [ ] components/client/MigrationRequestForm.tsx 作成
- [ ] lib/auth/migration.ts 作成（移管関連のServer Actions）
- [ ] メール形式バリデーション実装

### 管理者承認機能
- [ ] app/(admin)/migration/page.tsx 作成（承認管理ページ）
- [ ] components/server/MigrationList.tsx 作成
- [ ] components/client/MigrationApprovalForm.tsx 作成
- [ ] 承認・拒否のServer Actions実装

### メール移管実行機能
- [ ] Supabase Admin API を使用した実際のメール更新
- [ ] app/api/migration/execute/route.ts 作成
- [ ] データ整合性確認機能
- [ ] ロールバック機能実装

### 通知・確認機能
- [ ] 移管申請完了メール送信
- [ ] 承認通知メール送信
- [ ] 移管完了確認メール送信
- [ ] 移管ステータス表示

### セキュリティ機能
- [ ] 移管履歴ログ記録
- [ ] IP アドレス・ユーザーエージェント記録
- [ ] 移管回数制限実装
- [ ] 不正アクセス検知

### UI/UX改善
- [ ] 移管プロセスの進捗表示
- [ ] 確認ダイアログ実装
- [ ] エラーメッセージ改善
- [ ] ヘルプ・説明テキスト追加

## 実装内容

### 1. 移管関連 Server Actions

#### lib/auth/migration.ts
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

// 移管申請
export async function requestMigration(formData: FormData) {
  const newEmail = formData.get('newEmail') as string
  const reason = formData.get('reason') as string
  
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: '認証が必要です' }
  }
  
  // 既に申請中の移管がないかチェック
  const { data: existingRequest } = await supabase
    .from('email_migration_logs')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['requested', 'approved'])
    .single()
  
  if (existingRequest) {
    return { error: '既に移管申請中です' }
  }
  
  // 移管申請をデータベースに記録
  const headersList = headers()
  const { error } = await supabase
    .from('email_migration_logs')
    .insert({
      user_id: user.id,
      old_email: user.email!,
      new_email: newEmail,
      status: 'requested',
      notes: reason,
    })
  
  if (error) {
    return { error: '申請の保存に失敗しました' }
  }
  
  // 監査ログ記録
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'migration_requested',
    details: {
      old_email: user.email,
      new_email: newEmail,
      reason: reason
    },
    ip_address: headersList.get('x-forwarded-for'),
    user_agent: headersList.get('user-agent')
  })
  
  revalidatePath('/migration')
  return { success: true, message: '移管申請を受け付けました' }
}

// 移管承認（管理者のみ）
export async function approveMigration(requestId: string, notes?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: '認証が必要です' }
  }
  
  // 管理者権限チェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'admin') {
    return { error: '管理者権限が必要です' }
  }
  
  // 移管申請を承認
  const { error } = await supabase
    .from('email_migration_logs')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      notes: notes || null
    })
    .eq('id', requestId)
    .eq('status', 'requested')
  
  if (error) {
    return { error: '承認処理に失敗しました' }
  }
  
  revalidatePath('/admin/migration')
  return { success: true, message: '移管申請を承認しました' }
}

// 移管実行（管理者のみ）
export async function executeMigration(requestId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: '認証が必要です' }
  }
  
  // 管理者権限チェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'admin') {
    return { error: '管理者権限が必要です' }
  }
  
  // 移管申請情報を取得
  const { data: migration, error: migrationError } = await supabase
    .from('email_migration_logs')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'approved')
    .single()
  
  if (migrationError || !migration) {
    return { error: '承認済みの移管申請が見つかりません' }
  }
  
  try {
    // Supabase Admin API を使用してメールアドレス更新
    const response = await fetch('/api/migration/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: migration.user_id,
        newEmail: migration.new_email,
        requestId: requestId
      })
    })
    
    const result = await response.json()
    
    if (!response.ok || result.error) {
      throw new Error(result.error || 'メール更新に失敗しました')
    }
    
    // 移管完了を記録
    await supabase
      .from('email_migration_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', requestId)
    
    revalidatePath('/admin/migration')
    return { success: true, message: 'メール移管が完了しました' }
    
  } catch (error) {
    // 失敗を記録
    await supabase
      .from('email_migration_logs')
      .update({
        status: 'failed',
        notes: `実行エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
      })
      .eq('id', requestId)
    
    return { error: `移管実行に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` }
  }
}
```

### 2. 移管申請ページ

#### app/(auth)/migration/page.tsx
```typescript
import { createClient } from '@/lib/supabase/server'
import { MigrationRequestForm } from '@/components/client/MigrationRequestForm'
import { MigrationStatus } from '@/components/server/MigrationStatus'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function MigrationPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  // 生徒は移管不可
  if (profile?.role === 'student') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-medium text-yellow-800">アクセス制限</h2>
          <p className="mt-2 text-yellow-700">
            生徒アカウントはメールアドレス移管の対象外です。
            保護者にお問い合わせください。
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            メールアドレス移管
          </h1>
          <p className="text-gray-600">
            Gmailエイリアスから実際のメールアドレスへの移管を申請できます。
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              移管申請
            </h2>
            <MigrationRequestForm currentEmail={user.email!} />
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              移管ステータス
            </h2>
            <Suspense fallback={<div>読み込み中...</div>}>
              <MigrationStatus userId={user.id} />
            </Suspense>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">移管プロセスについて</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>新しいメールアドレスを入力して移管を申請</li>
          <li>管理者による本人確認・承認（1-2営業日）</li>
          <li>管理者による移管実行</li>
          <li>新しいメールアドレスでの確認</li>
          <li>データ引き継ぎ確認・完了</li>
        </ol>
        <div className="mt-4 p-4 bg-blue-100 rounded-md">
          <p className="text-sm text-blue-900">
            <strong>重要:</strong> 移管後は元のGmailエイリアスでログインできなくなります。
            新しいメールアドレスとパスワードを必ず控えておいてください。
          </p>
        </div>
      </div>
    </div>
  )
}
```

### 3. 移管申請フォーム（Client Component）

#### components/client/MigrationRequestForm.tsx
```typescript
'use client'

import { useState, useTransition } from 'react'
import { requestMigration } from '@/lib/auth/migration'

interface MigrationRequestFormProps {
  currentEmail: string
}

export function MigrationRequestForm({ currentEmail }: MigrationRequestFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null)
      setSuccess(null)
      
      const result = await requestMigration(formData)
      
      if (result.error) {
        setError(result.error)
      } else if (result.success) {
        setSuccess(result.message!)
        // フォームリセット
        ;(document.getElementById('migrationForm') as HTMLFormElement)?.reset()
      }
    })
  }

  return (
    <form id="migrationForm" action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="currentEmail" className="block text-sm font-medium text-gray-700">
          現在のメールアドレス
        </label>
        <input
          type="email"
          id="currentEmail"
          value={currentEmail}
          disabled
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">
          新しいメールアドレス *
        </label>
        <input
          type="email"
          id="newEmail"
          name="newEmail"
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="new-email@example.com"
        />
        <p className="mt-1 text-xs text-gray-500">
          実際に使用可能なメールアドレスを入力してください
        </p>
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
          移管理由（任意）
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="移管が必要な理由をご記入ください（管理者への参考情報として使用されます）"
        />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">確認事項</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>移管後は現在のメールアドレスでログインできなくなります</li>
                <li>管理者による承認が必要です（1-2営業日）</li>
                <li>新しいメールアドレスで確認メールを受信できる必要があります</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {success && (
        <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-md p-3">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isPending ? '申請中...' : '移管申請を送信'}
      </button>
    </form>
  )
}
```

### 4. 移管実行 API

#### app/api/migration/execute/route.ts
```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service Role Key を使用した管理者用クライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { userId, newEmail, requestId } = await request.json()
    
    if (!userId || !newEmail || !requestId) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }
    
    // 管理者権限でユーザーのメールアドレスを更新
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    )
    
    if (error) {
      console.error('メール更新エラー:', error)
      return NextResponse.json(
        { error: `メール更新に失敗しました: ${error.message}` },
        { status: 500 }
      )
    }
    
    // 成功をログに記録
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'email_migration_executed',
      details: {
        request_id: requestId,
        new_email: newEmail,
        executed_by: 'system'
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'メールアドレスの更新が完了しました',
      user: data.user
    })
    
  } catch (error) {
    console.error('移管実行エラー:', error)
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
```

### 5. 管理者用承認ページ

#### app/(admin)/migration/page.tsx
```typescript
import { createClient } from '@/lib/supabase/server'
import { MigrationList } from '@/components/server/MigrationList'
import { redirect } from 'next/navigation'

export default async function AdminMigrationPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            メール移管管理（管理者）
          </h1>
          <p className="text-gray-600 mb-6">
            ユーザーからのメールアドレス移管申請の承認・実行を管理します。
          </p>
          
          <MigrationList />
        </div>
      </div>
    </div>
  )
}
```

## 受け入れ基準
- [ ] 保護者が移管申請を正常に送信できる
- [ ] 管理者が申請一覧を確認できる
- [ ] 管理者が申請を承認・拒否できる
- [ ] 管理者が移管を安全に実行できる
- [ ] 移管後のログイン動作確認ができる
- [ ] 全てのデータが正常に引き継がれる
- [ ] 移管履歴が適切にログ記録される
- [ ] セキュリティ要件が満たされている

## セキュリティ考慮事項
- 移管実行時の多要素認証検討
- 移管回数制限（月間・年間）
- IP制限・不正アクセス監視
- 機密情報の適切な暗号化
- 監査ログの改ざん防止

## 関連チケット
- [04-dashboard-implementation.md](./04-dashboard-implementation.md) - ダッシュボード実装
- [06-testing-implementation.md](./06-testing-implementation.md) - テスト実装

## 注意点
- 本番環境での十分なテスト実施
- ユーザーへの事前説明の徹底
- 緊急時のロールバック手順準備
- 管理者の適切な権限管理