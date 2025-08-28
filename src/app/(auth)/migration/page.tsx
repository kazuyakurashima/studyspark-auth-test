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
        
        <Suspense fallback={<div>移管状況を読み込み中...</div>}>
          <MigrationStatus userId={user.id} />
        </Suspense>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            移管プロセスについて
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>新しいメールアドレスを入力して申請</li>
            <li>管理者による確認・承認</li>
            <li>新しいメールアドレスへ確認メール送信</li>
            <li>メールアドレス移管完了</li>
            <li>新しいメールアドレスでログイン可能に</li>
          </ol>
          <p className="mt-4 text-sm text-blue-700">
            移管完了まで通常1-3営業日かかります。
          </p>
        </div>
      </div>
    </div>
  )
}