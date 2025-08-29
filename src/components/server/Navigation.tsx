import { User } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import Link from 'next/link'
import { LogoutButtonSmall } from '@/components/client/LogoutButtonSmall'

type Profile = Database['public']['Tables']['profiles']['Row']

interface NavigationProps {
  user: User
  profile: Profile | null
}

export function Navigation({ user, profile }: NavigationProps) {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">StudySpark Auth</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                ダッシュボード
              </Link>
              {profile?.role === 'parent' && (
                <Link
                  href="/students/add"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  生徒追加
                </Link>
              )}
              {profile?.role === 'student' && (
                <Link
                  href="/dashboard/student"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  学習記録
                </Link>
              )}
              {profile?.role !== 'student' && (
                <Link
                  href="/migration"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  メール移管
                </Link>
              )}
              {profile?.role === 'admin' && (
                <>
                  <Link
                    href="/admin/migration"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    移管管理
                  </Link>
                  <Link
                    href="/debug"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    デバッグ
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700">
                {profile?.display_name || user.email || 'ユーザー'}
              </span>
              {profile && (
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
              )}
            </div>
            <div>
              <LogoutButtonSmall />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}