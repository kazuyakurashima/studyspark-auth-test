import { createClient } from '@/lib/supabase/server'
import { StudentAddForm } from '@/components/client/StudentAddForm'
import { redirect } from 'next/navigation'

export default async function AddStudentPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザーの権限チェック（parentまたはadmin）
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, family_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['parent', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            生徒アカウント追加
          </h1>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">生徒アカウントについて</h3>
            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
              <li>生徒はログインIDとパスワードでログインします</li>
              <li>ログインIDは英数字のみで設定してください（例: taro2015, student123）</li>
              <li>パスワードは4文字以上で設定してください</li>
              <li>家族内でのみ生徒アカウントを管理できます</li>
            </ul>
          </div>

          <StudentAddForm familyId={profile.family_id} />
        </div>
      </div>
    </div>
  )
}