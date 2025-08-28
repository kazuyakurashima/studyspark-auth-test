import { User } from '@supabase/supabase-js'
import { LogoutButton } from '@/components/client/LogoutButton'

interface SessionInfoProps {
  user: User
}

export function SessionInfo({ user }: SessionInfoProps) {
  const createdAt = new Date(user.created_at!)
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          セッション情報
        </h2>
        
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">アカウント作成日</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {createdAt.toLocaleString('ja-JP')}
            </dd>
          </div>

          {lastSignIn && (
            <div>
              <dt className="text-sm font-medium text-gray-500">最終ログイン</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {lastSignIn.toLocaleString('ja-JP')}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-gray-500">メール確認</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.email_confirmed_at ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user.email_confirmed_at ? '確認済み' : '未確認'}
              </span>
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}