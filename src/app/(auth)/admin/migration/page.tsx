import { createClient } from '@/lib/supabase/server'
import { MigrationAdminPanel } from '@/components/server/MigrationAdminPanel'
import { redirect } from 'next/navigation'

export default async function AdminMigrationPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 管理者権限チェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // 移管申請一覧を取得
  const { data: migrations, error } = await supabase
    .from('email_migration_logs')
    .select('*')
    .order('requested_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching migrations:', error)
  }
  
  console.log('Migrations data:', migrations)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            メール移管管理
          </h1>
          
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium text-yellow-900">管理者の責任</h3>
            <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
              <li>移管申請の内容を慎重に確認してください</li>
              <li>本人確認が完了した申請のみ承認してください</li>
              <li>移管実行は元に戻せない操作です</li>
            </ul>
          </div>

          {/* デバッグ情報 */}
          <div className="mb-4 p-4 bg-gray-100 rounded text-xs">
            <p>取得した移管申請数: {migrations?.length || 0}</p>
            {error && <p className="text-red-600">エラー: {JSON.stringify(error)}</p>}
          </div>
          
          <MigrationAdminPanel migrations={migrations || []} />
        </div>
      </div>
    </div>
  )
}