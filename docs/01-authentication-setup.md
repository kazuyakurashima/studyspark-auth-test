# 01. 認証基盤セットアップ

## 概要
Next.js App Router + Supabase Auth を使用した認証基盤の初期セットアップを行います。

## 優先度
🔥 **高** - プロジェクトの基盤となる重要なタスク

## 見積もり工数
**8時間**（2日間）

## 前提条件
- Node.js 20.x がインストールされている
- Supabase プロジェクトが作成されている
- 環境変数が設定されている

## Todo リスト

### 環境構築
- [ ] Supabase プロジェクト作成・設定確認
- [ ] 必要なパッケージのインストール
- [ ] 環境変数ファイル (.env.local) 作成
- [ ] TypeScript 設定確認

### Supabase クライアント初期化
- [ ] Server Component 用クライアント (lib/supabase/server.ts) 実装
- [ ] Client Component 用クライアント (lib/supabase/client.ts) 実装  
- [ ] Middleware 用ヘルパー (lib/supabase/middleware.ts) 実装
- [ ] 型定義ファイル生成設定

### 基本ディレクトリ構造作成
- [ ] app ディレクトリ構造作成
- [ ] ルートグループ作成: (auth)、(public)
- [ ] components ディレクトリ作成: server/、client/
- [ ] lib ディレクトリ作成

### ミドルウェア実装
- [ ] middleware.ts の最小限実装
- [ ] セッション更新機能実装
- [ ] 動作確認

## 実装内容

### 1. パッケージインストール
```bash
npm install @supabase/ssr @supabase/supabase-js
npm install -D @types/node
```

### 2. 環境変数設定
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Supabase クライアント実装
```typescript
// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Server Component内でのcookie設定エラーを処理
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // エラー処理
          }
        },
      },
    }
  )
}
```

### 4. ディレクトリ構造
```
app/
├── (auth)/           # 認証必須ルート
├── (public)/         # 認証不要ルート
├── api/
│   └── auth/
├── layout.tsx
└── page.tsx

components/
├── server/           # Server Components
└── client/           # Client Components

lib/
├── supabase/
│   ├── server.ts
│   ├── client.ts
│   └── middleware.ts
└── auth/
    └── actions.ts
```

## 受け入れ基準
- [ ] Supabase クライアントが正常に初期化できる
- [ ] Server/Client Components で適切にクライアントが使い分けられる
- [ ] 環境変数が正しく読み込まれる
- [ ] TypeScript でコンパイルエラーが発生しない
- [ ] 開発サーバーが正常に起動する

## 注意点
- `@supabase/auth-helpers-nextjs` は非推奨のため使用しない
- Cookie ベースのセッション管理を採用
- Server Components First の原則を遵守
- 型安全性を重視した実装

## 関連チケット
- [02-database-design.md](./02-database-design.md) - データベース設計
- [03-authentication-features.md](./03-authentication-features.md) - 認証機能実装

## 参考資料
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)