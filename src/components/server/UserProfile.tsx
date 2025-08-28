import { User } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface UserProfileProps {
  user: User
  profile: Profile
}

export function UserProfile({ user, profile }: UserProfileProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          ユーザー情報
        </h2>
        
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">表示名</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {profile.display_name || '未設定'}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">役割</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                profile.role === 'admin' ? 'bg-red-100 text-red-800' :
                profile.role === 'parent' ? 'bg-blue-100 text-blue-800' :
                profile.role === 'teacher' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {profile.role === 'admin' ? '管理者' :
                 profile.role === 'parent' ? '保護者' :
                 profile.role === 'teacher' ? '指導者' : '生徒'}
              </span>
            </dd>
          </div>

          {user.email && (
            <div>
              <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {user.email}
              </dd>
            </div>
          )}

          {profile.login_id && (
            <div>
              <dt className="text-sm font-medium text-gray-500">ログインID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {profile.login_id}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-gray-500">家族ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">
              {profile.family_id}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">ユーザーID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono text-xs">
              {user.id}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}