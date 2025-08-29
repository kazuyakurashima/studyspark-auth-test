/**
 * Supabase Admin API ユーティリティ関数
 * Service Role Keyを使用したAdmin操作をまとめる
 */

interface CreateUserParams {
  email: string
  password: string
  userMetadata: Record<string, any>
  emailConfirm?: boolean
}

interface UpdateUserEmailParams {
  userId: string
  newEmail: string
  emailConfirm?: boolean
}

/**
 * Supabase Admin APIを使用してユーザーを作成
 */
export async function createUserWithAdmin(params: CreateUserParams) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      email_confirm: params.emailConfirm ?? true,
      user_metadata: params.userMetadata
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Failed to create user: ${errorData.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Supabase Admin APIを使用してユーザーのメールアドレスを更新
 */
export async function updateUserEmailWithAdmin(params: UpdateUserEmailParams) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${params.userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey
    },
    body: JSON.stringify({
      email: params.newEmail,
      email_confirm: params.emailConfirm ?? true
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Failed to update user email: ${errorData.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Supabase REST APIを使用してプロファイルを作成/更新
 */
export async function upsertProfile(profileData: any) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error('Supabase configuration is missing')
  }

  // まずプロファイルが存在するか確認
  const checkResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profileData.id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  })

  const existingProfiles = await checkResponse.json()
  
  let response
  if (existingProfiles && existingProfiles.length > 0) {
    // プロファイルが存在する場合は更新
    response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profileData.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(profileData)
    })
  } else {
    // プロファイルが存在しない場合は作成
    response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(profileData)
    })
  }

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Failed to upsert profile: ${errorData.message || response.statusText}`)
  }

  return response.json()
}