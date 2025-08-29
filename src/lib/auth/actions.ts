'use server'

import { createClient } from '@/lib/supabase/server'
import { createUserWithAdmin, upsertProfile } from '@/lib/supabase/admin'
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
  
  // loginIdのバリデーション（英数字のみ）
  const loginIdPattern = /^[a-zA-Z0-9]+$/
  if (!loginIdPattern.test(loginId)) {
    return { error: 'ログインIDは英数字のみで入力してください' }
  }
  
  const supabase = createClient()
  
  // loginIdの重複チェック
  const { data: existingStudent } = await supabase
    .from('profiles')
    .select('id')
    .eq('login_id', loginId)
    .maybeSingle()
  
  if (existingStudent) {
    return { error: 'このログインIDは既に使用されています' }
  }
  
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
  
  // familyIdを取得（フォームから渡されている場合）
  const familyId = formData.get('familyId') as string || parentProfile.family_id
  
  // 仮想メールアドレス生成
  const virtualEmail = `${loginId}@studyspark.local`
  
  try {
    // Supabase Admin APIを使用してユーザーを作成
    const newStudent = await createUserWithAdmin({
      email: virtualEmail,
      password: password,
      userMetadata: {
        display_name: `${lastName} ${firstName}`,
        role: 'student',
        login_id: loginId,
        last_name: lastName,
        first_name: firstName,
        last_name_kana: lastNameKana,
        first_name_kana: firstNameKana
      }
    })
    
    // レスポンス構造を確認（userプロパティがない場合は直接idを使用）
    const studentId = newStudent.user?.id || newStudent.id
    
    if (!studentId) {
      console.error('Student ID not found in response:', newStudent)
      return { error: '生徒アカウントのIDが取得できませんでした' }
    }
    
    // プロファイルを作成/更新
    const profileData = {
      id: studentId,
      family_id: familyId,
      display_name: `${lastName} ${firstName}`,
      role: 'student',
      login_id: loginId,
      last_name: lastName,
      first_name: firstName,
      last_name_kana: lastNameKana,
      first_name_kana: firstNameKana
    }
    
    await upsertProfile(profileData)
    
    
    // 保護者と生徒の関連を作成（Service Role Key使用）
    console.log('Creating parent-student relation:', { parent_id: user.id, student_id: studentId })
    
    const relationResponse = await fetch(`${supabaseUrl}/rest/v1/parent_student_relations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        parent_id: user.id,
        student_id: studentId,
        relation_type: 'parent'
      })
    })
    
    if (!relationResponse.ok) {
      const relationError = await relationResponse.json()
      console.error('Relation creation error:', relationError)
    } else {
      const relationData = await relationResponse.json()
      console.log('Relation created successfully:', relationData)
    }
    
    return {
      success: true,
      message: `生徒アカウントが作成されました（ログインID: ${loginId}）`
    }
  } catch (error) {
    console.error('Student account creation exception:', error)
    return { 
      error: `生徒アカウント作成中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
    }
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