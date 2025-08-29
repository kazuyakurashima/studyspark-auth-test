'use client'

import { createStudentAccount } from '@/lib/auth/actions'
import { useState } from 'react'

interface StudentAddFormProps {
  familyId?: string
}

export function StudentAddForm({ familyId }: StudentAddFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    // familyIdを追加
    if (familyId) {
      formData.append('familyId', familyId)
    }

    const result = await createStudentAccount(formData)
    
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(result.message || '生徒アカウントが正常に作成されました')
      // フォームをリセット
      const form = document.querySelector('form') as HTMLFormElement
      form?.reset()
      // ページをリフレッシュして新しい生徒を表示
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    }
    
    setIsLoading(false)
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            姓 <span className="text-red-500">*</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="山田"
          />
        </div>
        
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            名 <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="太郎"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="lastNameKana" className="block text-sm font-medium text-gray-700">
            姓（ひらがな） <span className="text-red-500">*</span>
          </label>
          <input
            id="lastNameKana"
            name="lastNameKana"
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="やまだ"
          />
        </div>
        
        <div>
          <label htmlFor="firstNameKana" className="block text-sm font-medium text-gray-700">
            名（ひらがな） <span className="text-red-500">*</span>
          </label>
          <input
            id="firstNameKana"
            name="firstNameKana"
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="たろう"
          />
        </div>
      </div>

      <div>
        <label htmlFor="loginId" className="block text-sm font-medium text-gray-700">
          ログインID <span className="text-red-500">*</span>
        </label>
        <input
          id="loginId"
          name="loginId"
          type="text"
          required
          pattern="[a-zA-Z0-9]+"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="taro2015"
        />
        <p className="mt-1 text-sm text-gray-500">
          英数字のみで入力してください（例: taro2015, student123）
        </p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          パスワード <span className="text-red-500">*</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="4文字以上"
        />
        <p className="mt-1 text-sm text-gray-500">
          4文字以上で入力してください
        </p>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '作成中...' : '生徒アカウントを作成'}
        </button>
      </div>
    </form>
  )
}