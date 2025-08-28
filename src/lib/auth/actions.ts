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

// 保護者・指導者登録
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

  // プロファイル作成はトリガーまたはコールバック内で処理
  return { success: 'メールアドレスに確認メールを送信しました' }
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

// 生徒アカウント作成（保護者のみ）
export async function createStudentAccount(formData: FormData) {
  const loginId = formData.get('loginId') as string
  const password = formData.get('password') as string
  const lastName = formData.get('lastName') as string
  const firstName = formData.get('firstName') as string
  const lastNameKana = formData.get('lastNameKana') as string
  const firstNameKana = formData.get('firstNameKana') as string
  
  const supabase = createClient()
  
  // 現在のユーザーを取得
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: '認証されていません' }
  }
  
  // 保護者のプロファイルを取得
  const { data: parentProfile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('id', user.id)
    .single()
  
  if (!parentProfile || parentProfile.role !== 'parent') {
    return { error: '保護者アカウントでログインしてください' }
  }
  
  // 仮想メールアドレス生成
  const virtualEmail = `${loginId}@studyspark.local`
  
  // TODO: 実際の実装では、Supabase Admin APIを使用して生徒アカウントを作成
  // ここではダミー実装として成功を返す
  return {
    success: true,
    message: `生徒アカウント作成機能は実装準備中です（ログインID: ${loginId}）`
  }
}

// ログアウト
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}