'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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
  
  // headersを最初に取得
  const headersList = headers()
  
  try {
    // 既に申請中の移管がないかチェック
    const { data: existingRequest } = await supabase
      .from('email_migration_logs')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['requested', 'approved'])
      .maybeSingle()  // singleの代わりにmaybeSingleを使用
    
    if (existingRequest) {
      return { error: '既に移管申請中です' }
    }
    
    // 移管申請をデータベースに記録
    const { data, error } = await supabase
      .from('email_migration_logs')
      .insert({
        user_id: user.id,
        old_email: user.email!,
        new_email: newEmail,
        status: 'requested',
        notes: reason,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Migration request error:', error)
      return { error: `申請の保存に失敗しました: ${error.message}` }
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
    
  } catch (err) {
    console.error('Migration request exception:', err)
    return { error: `申請処理でエラーが発生しました: ${err instanceof Error ? err.message : '不明なエラー'}` }
  }
  
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

// 移管拒否（管理者のみ）
export async function rejectMigration(requestId: string, reason: string) {
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
  
  // 移管申請を拒否
  const { error } = await supabase
    .from('email_migration_logs')
    .update({
      status: 'failed',
      notes: `拒否理由: ${reason}`,
      approved_at: new Date().toISOString(),
      approved_by: user.id
    })
    .eq('id', requestId)
    .eq('status', 'requested')
  
  if (error) {
    return { error: '拒否処理に失敗しました' }
  }
  
  revalidatePath('/admin/migration')
  return { success: true, message: '移管申請を拒否しました' }
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