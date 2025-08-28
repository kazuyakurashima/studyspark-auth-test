'use client'

import { useState, useTransition } from 'react'
import { requestMigration } from '@/lib/auth/migration'

interface MigrationRequestFormProps {
  currentEmail: string
}

export function MigrationRequestForm({ currentEmail }: MigrationRequestFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null)
      setSuccess(null)
      
      const newEmail = formData.get('newEmail') as string
      const confirmEmail = formData.get('confirmEmail') as string
      
      // メールアドレス確認
      if (newEmail !== confirmEmail) {
        setError('メールアドレスが一致しません')
        return
      }
      
      // 現在のメールアドレスと同じでないか確認
      if (newEmail === currentEmail) {
        setError('現在のメールアドレスと同じです')
        return
      }
      
      const result = await requestMigration(formData)
      
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSuccess(result.message || '移管申請を受け付けました')
        // フォームをリセット
        ;(document.getElementById('migrationForm') as HTMLFormElement)?.reset()
      }
    })
  }

  return (
    <form id="migrationForm" action={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          現在のメールアドレス
        </label>
        <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded-md">
          {currentEmail}
        </div>
      </div>

      <div>
        <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">
          新しいメールアドレス
        </label>
        <input
          type="email"
          id="newEmail"
          name="newEmail"
          required
          disabled={success !== null}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
          placeholder="new@example.com"
        />
      </div>

      <div>
        <label htmlFor="confirmEmail" className="block text-sm font-medium text-gray-700">
          新しいメールアドレス（確認）
        </label>
        <input
          type="email"
          id="confirmEmail"
          name="confirmEmail"
          required
          disabled={success !== null}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
          placeholder="new@example.com"
        />
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
          移管理由
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          required
          disabled={success !== null}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
          placeholder="移管を希望する理由をご記入ください"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="text-green-600 text-sm">
          {success}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending || success !== null}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isPending ? '申請中...' : '移管を申請'}
        </button>
      </div>
    </form>
  )
}