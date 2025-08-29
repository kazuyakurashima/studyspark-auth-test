import { StudentLoginForm } from '@/components/client/StudentLoginForm'
import Link from 'next/link'

export default function StudentLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            生徒ログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            ログインID（英数字）とパスワードでログイン
          </p>
        </div>
        
        <StudentLoginForm />
        
        <div className="text-center">
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-500 text-sm"
          >
            保護者・指導者の方はこちら
          </Link>
        </div>
      </div>
    </div>
  )
}