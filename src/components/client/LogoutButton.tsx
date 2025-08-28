'use client'

import { signOut } from '@/lib/auth/actions'
import { useTransition } from 'react'

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
    >
      {isPending ? 'ログアウト中...' : 'ログアウト'}
    </button>
  )
}