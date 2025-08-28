import { createClient } from '@/lib/supabase/server'

interface MigrationStatusProps {
  userId: string
}

export async function MigrationStatus({ userId }: MigrationStatusProps) {
  const supabase = createClient()
  
  // ユーザーの移管申請履歴を取得
  const { data: migrations } = await supabase
    .from('email_migration_logs')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false })
    .limit(5)

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          移管履歴
        </h2>
        
        {migrations && migrations.length > 0 ? (
          <div className="space-y-3">
            {migrations.map((migration) => (
              <div
                key={migration.id}
                className="border rounded-lg p-3 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {migration.new_email}
                  </span>
                  <StatusBadge status={migration.status} />
                </div>
                
                <dl className="text-xs text-gray-500 space-y-1">
                  <div>
                    <dt className="inline">申請日: </dt>
                    <dd className="inline">
                      {new Date(migration.requested_at).toLocaleDateString('ja-JP')}
                    </dd>
                  </div>
                  
                  {migration.approved_at && (
                    <div>
                      <dt className="inline">承認日: </dt>
                      <dd className="inline">
                        {new Date(migration.approved_at).toLocaleDateString('ja-JP')}
                      </dd>
                    </div>
                  )}
                  
                  {migration.completed_at && (
                    <div>
                      <dt className="inline">完了日: </dt>
                      <dd className="inline">
                        {new Date(migration.completed_at).toLocaleDateString('ja-JP')}
                      </dd>
                    </div>
                  )}
                  
                  {migration.notes && (
                    <div>
                      <dt className="inline">備考: </dt>
                      <dd className="inline">{migration.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            移管履歴はありません
          </p>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    requested: { color: 'bg-yellow-100 text-yellow-800', label: '申請中' },
    approved: { color: 'bg-blue-100 text-blue-800', label: '承認済み' },
    completed: { color: 'bg-green-100 text-green-800', label: '完了' },
    failed: { color: 'bg-red-100 text-red-800', label: '失敗' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: 'bg-gray-100 text-gray-800',
    label: status
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}