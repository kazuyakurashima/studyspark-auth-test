export interface User {
  id: string
  email?: string
  role: 'admin' | 'parent' | 'teacher' | 'student'
  display_name?: string
  family_id: string
  login_id?: string // 生徒の場合のみ
}

export interface AuthError {
  message: string
  status?: number
}

export interface AuthResult {
  success?: boolean
  error?: string
  message?: string
  user?: User
}

export interface StudentLoginData {
  loginId: string
  password: string
}

export interface ParentLoginData {
  email: string
  password: string
}

export interface Session {
  user: User | null
  access_token?: string
  refresh_token?: string
}