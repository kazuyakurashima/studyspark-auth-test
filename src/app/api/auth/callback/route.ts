import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/dashboard'

    if (code) {
      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        // リダイレクト先のURLを構築
        const redirectUrl = new URL(next, requestUrl.origin)
        return NextResponse.redirect(redirectUrl)
      }
    }

    // エラーが発生した場合はログインページへ
    return NextResponse.redirect(new URL('/login?error=auth-failed', requestUrl.origin))
  } catch (error) {
    console.error('Auth callback error:', error)
    // エラーが発生した場合は安全にログインページへリダイレクト
    return NextResponse.redirect(new URL('/login', request.url))
  }
}