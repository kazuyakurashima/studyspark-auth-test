import { ResetPasswordForm } from '@/components/client/ResetPasswordForm'
import Link from 'next/link'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            パスワードのリセット
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            登録されたメールアドレスを入力してください
          </p>
        </div>
        
        <ResetPasswordForm />
        
        <div className="text-center">
          <Link
            href="/login"
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            ログインページに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}