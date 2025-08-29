import { MigrationActionButtons } from '@/components/client/MigrationActionButtons'

type MigrationRequest = {
  id: string
  user_id: string
  old_email: string
  new_email: string
  status: string
  requested_at: string
  approved_at: string | null
  completed_at: string | null
  notes: string | null
  approved_by: string | null
  profiles?: { display_name: string } | null
  approved_profiles?: { display_name: string } | null
}

interface MigrationAdminPanelProps {
  migrations: MigrationRequest[]
}

export function MigrationAdminPanel({ migrations }: MigrationAdminPanelProps) {
  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'requested':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'approved':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'requested': return '申請中'
      case 'approved': return '承認済み'
      case 'completed': return '完了'
      case 'failed': return '失敗'
      default: return status
    }
  }

  if (migrations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">移管申請はありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {migrations.map((migration) => (
        <div key={migration.id} className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {migration.profiles?.display_name || 'ユーザー'}
                </h3>
                <span className={getStatusBadge(migration.status)}>
                  {getStatusText(migration.status)}
                </span>
              </div>
              
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">現在のメール</dt>
                  <dd className="text-sm text-gray-900 font-mono">{migration.old_email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">新しいメール</dt>
                  <dd className="text-sm text-gray-900 font-mono">{migration.new_email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">申請日時</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(migration.requested_at).toLocaleString('ja-JP')}
                  </dd>
                </div>
                {migration.approved_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">承認日時</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(migration.approved_at).toLocaleString('ja-JP')}
                    </dd>
                  </div>
                )}
                {migration.completed_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">完了日時</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(migration.completed_at).toLocaleString('ja-JP')}
                    </dd>
                  </div>
                )}
                {migration.approved_profiles && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">承認者</dt>
                    <dd className="text-sm text-gray-900">
                      {migration.approved_profiles.display_name}
                    </dd>
                  </div>
                )}
              </dl>
              
              {migration.notes && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-gray-500">理由・備考</dt>
                  <dd className="text-sm text-gray-900 mt-1 p-2 bg-gray-50 rounded">
                    {migration.notes}
                  </dd>
                </div>
              )}
            </div>
            
            <div className="ml-6 flex-shrink-0">
              <MigrationActionButtons
                migration={migration}
                canApprove={migration.status === 'requested'}
                canExecute={migration.status === 'approved'}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}