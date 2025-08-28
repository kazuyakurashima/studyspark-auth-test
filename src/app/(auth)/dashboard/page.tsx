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

  let profile = null
  
  // プロファイル取得
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !existingProfile) {
    // プロファイルが存在しない場合は作成を試みる
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: user.email?.split('@')[0] || 'ユーザー',
        role: 'parent'
      })
      .select()
      .single()
    
    if (insertError) {
      return (
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-medium text-red-800">プロファイルエラー</h2>
            <p className="mt-2 text-red-700">
              プロファイル情報の取得に失敗しました。
            </p>
            <div className="mt-4 text-xs text-red-600">
              <p>User ID: {user.id}</p>
              <p>Email: {user.email}</p>
              <p>Profile Error: {profileError?.message || 'No profile found'}</p>
              <p>Insert Error: {insertError?.message}</p>
            </div>
          </div>
        </div>
      )
    }
    
    profile = newProfile
  } else {
    profile = existingProfile
  }

  if (!profile) {
    return <div>プロファイル情報の取得に失敗しました</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ダッシュボード
          </h1>
          <p className="text-gray-600">
            StudySpark認証テストシステム
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