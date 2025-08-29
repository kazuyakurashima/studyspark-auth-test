import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DebugPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 管理者のみアクセス可能
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // 全プロファイル取得
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // 親子関係取得
  const { data: relations } = await supabase
    .from('parent_student_relations')
    .select('*')
  
  // 移管申請取得
  const { data: migrations } = await supabase
    .from('email_migration_logs')
    .select('*')
    .order('requested_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            デバッグ情報（管理者のみ）
          </h1>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">プロファイル一覧</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">表示名</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">役割</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">ログインID</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">家族ID</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">作成日時</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {profiles?.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-4 py-2 text-xs font-mono text-gray-900">
                        {profile.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {profile.display_name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded ${
                          profile.role === 'admin' ? 'bg-red-100 text-red-800' :
                          profile.role === 'parent' ? 'bg-blue-100 text-blue-800' :
                          profile.role === 'student' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {profile.role}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-900">
                        {profile.login_id || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-900">
                        {profile.family_id}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {profile.created_at ? new Date(profile.created_at).toLocaleString('ja-JP') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">親子関係一覧</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">保護者ID</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">生徒ID</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">関係タイプ</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">作成日時</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {relations?.map((relation) => (
                    <tr key={relation.id}>
                      <td className="px-4 py-2 text-xs font-mono text-gray-900">
                        {relation.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-900">
                        {relation.parent_id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-900">
                        {relation.student_id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {relation.relation_type}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {relation.created_at ? new Date(relation.created_at).toLocaleString('ja-JP') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">移管申請一覧</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">ユーザーID</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">旧メール</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">新メール</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">ステータス</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">申請日時</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {migrations?.map((migration) => (
                    <tr key={migration.id}>
                      <td className="px-4 py-2 text-xs font-mono text-gray-900">
                        {migration.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-900">
                        {migration.user_id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-900">
                        {migration.old_email}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-900">
                        {migration.new_email}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded ${
                          migration.status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                          migration.status === 'approved' ? 'bg-green-100 text-green-800' :
                          migration.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {migration.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {migration.requested_at ? new Date(migration.requested_at).toLocaleString('ja-JP') : '-'}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-center text-gray-500">
                        移管申請データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}