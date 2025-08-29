'use client'

import { approveMigration, rejectMigration, executeMigration } from '@/lib/auth/migration'
import { useState } from 'react'

type MigrationRequest = {
  id: string
  status: string
}

interface MigrationActionButtonsProps {
  migration: MigrationRequest
  canApprove: boolean
  canExecute: boolean
}

export function MigrationActionButtons({ migration, canApprove, canExecute }: MigrationActionButtonsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleApprove() {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    const result = await approveMigration(migration.id)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(result.message || '承認しました')
    }
    
    setIsLoading(false)
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setError('拒否理由を入力してください')
      return
    }
    
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    const result = await rejectMigration(migration.id, rejectReason)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(result.message || '拒否しました')
      setShowRejectForm(false)
      setRejectReason('')
    }
    
    setIsLoading(false)
  }

  async function handleExecute() {
    if (!confirm('メール移管を実行しますか？この操作は元に戻せません。')) {
      return
    }
    
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    const result = await executeMigration(migration.id)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(result.message || '移管を実行しました')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <p className="text-xs text-green-800">{success}</p>
        </div>
      )}
      
      {canApprove && (
        <div className="flex flex-col space-y-2">
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? '処理中...' : '承認'}
          </button>
          
          <button
            onClick={() => setShowRejectForm(!showRejectForm)}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            拒否
          </button>
          
          {showRejectForm && (
            <div className="mt-2 p-3 border rounded bg-gray-50">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="拒否理由を入力してください"
                className="w-full text-sm border rounded p-2"
                rows={3}
              />
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={handleReject}
                  disabled={isLoading || !rejectReason.trim()}
                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                >
                  拒否実行
                </button>
                <button
                  onClick={() => {
                    setShowRejectForm(false)
                    setRejectReason('')
                    setError(null)
                  }}
                  className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {canExecute && (
        <button
          onClick={handleExecute}
          disabled={isLoading}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '実行中...' : '移管実行'}
        </button>
      )}
    </div>
  )
}