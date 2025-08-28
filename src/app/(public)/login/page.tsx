import { LoginForm } from '@/components/client/LoginForm'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            アカウントにログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            保護者・指導者の方はこちら
          </p>
        </div>
        
        <LoginForm />
        
        <div className="text-center space-y-2">
          <Link
            href="/register"
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            新規アカウント作成
          </Link>
          <br />
          <Link
            href="/reset-password"
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            パスワードをお忘れの方
          </Link>
          <br />
          <Link
            href="/student-login"
            className="text-gray-600 hover:text-gray-500 text-sm"
          >
            生徒の方はこちら
          </Link>
        </div>
      </div>
    </div>
  )
}