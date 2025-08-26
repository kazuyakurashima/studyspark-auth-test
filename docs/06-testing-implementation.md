# 06. テスト実装

## 概要
認証システム全体の品質担保と検証のため、包括的なテストスイートを実装します。単体テスト、統合テスト、E2Eテストを段階的に実施します。

## 優先度
🔥 **高** - システム品質保証の根幹

## 見積もり工数
**16時間**（4日間）

## 前提条件
- 全ての機能実装が完了している
- テストデータベース環境が用意されている
- Gmailエイリアスが設定されている

## Todo リスト

### テスト環境セットアップ
- [ ] Jest + Testing Library セットアップ
- [ ] Playwright E2E テストセットアップ
- [ ] テスト用環境変数設定
- [ ] テストデータベース準備
- [ ] CI/CD パイプライン設定

### 単体テスト (Jest)
- [ ] Server Actions テスト実装
- [ ] Client Components テスト実装
- [ ] データベース関数テスト実装
- [ ] バリデーション関数テスト実装
- [ ] ユーティリティ関数テスト実装

### 統合テスト
- [ ] 認証フロー統合テスト
- [ ] データベース操作統合テスト
- [ ] API エンドポイントテスト
- [ ] メール移管フロー統合テスト

### E2E テスト (Playwright)
- [ ] 保護者登録・ログインテスト
- [ ] 生徒登録・ログインテスト
- [ ] ダッシュボード機能テスト
- [ ] メール移管テスト
- [ ] 管理者機能テスト

### パフォーマンステスト
- [ ] 認証処理のレスポンステスト
- [ ] 同時接続テスト
- [ ] データベースクエリパフォーマンステスト

### セキュリティテスト
- [ ] 認証バイパステスト
- [ ] RLS ポリシーテスト
- [ ] SQL インジェクションテスト
- [ ] XSS 脆弱性テスト

## 実装内容

### 1. テスト環境セットアップ

#### package.json テスト依存関係
```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.4",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^14.5.1",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@playwright/test": "^1.40.0",
    "dotenv": "^16.3.1"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

#### jest.config.js
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

#### jest.setup.js
```javascript
import '@testing-library/jest-dom'

// Supabase Auth のモック
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}))

// Next.js router のモック
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  redirect: jest.fn(),
}))
```

### 2. Server Actions 単体テスト

#### __tests__/lib/auth/actions.test.ts
```typescript
import { signIn, signUp, signInStudent } from '@/lib/auth/actions'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server')
jest.mock('next/navigation')

const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
  },
  from: jest.fn(() => ({
    insert: jest.fn().mockResolvedValue({ error: null }),
  })),
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('Auth Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('signIn', () => {
    it('正常なログイン処理', async () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'password123')

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        error: null,
        data: { user: { id: '123', email: 'test@example.com' } }
      })

      const result = await signIn(formData)
      
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
      
      expect(result).toBeUndefined() // redirect が呼ばれる
    })

    it('ログイン失敗時のエラーハンドリング', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid@example.com')
      formData.append('password', 'wrongpassword')

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' }
      })

      const result = await signIn(formData)
      
      expect(result).toEqual({ error: 'Invalid credentials' })
    })
  })

  describe('signInStudent', () => {
    it('生徒ログイン処理（仮想メールアドレス変換）', async () => {
      const formData = new FormData()
      formData.append('loginId', 'たろう2015')
      formData.append('password', 'pass123')

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        error: null,
        data: { user: { id: '456' } }
      })

      await signInStudent(formData)
      
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'たろう2015@studyspark.local',
        password: 'pass123'
      })
    })

    it('生徒ログイン失敗時', async () => {
      const formData = new FormData()
      formData.append('loginId', 'invalid')
      formData.append('password', 'wrong')

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' }
      })

      const result = await signInStudent(formData)
      
      expect(result).toEqual({ 
        error: 'ログインIDまたはパスワードが間違っています' 
      })
    })
  })

  describe('signUp', () => {
    it('保護者新規登録処理', async () => {
      const formData = new FormData()
      formData.append('email', 'parent@example.com')
      formData.append('password', 'securepass123')
      formData.append('displayName', '山田太郎')

      mockSupabase.auth.signUp.mockResolvedValue({
        error: null,
        data: { user: { id: '789', email: 'parent@example.com' } }
      })

      const result = await signUp(formData)
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'parent@example.com',
        password: 'securepass123',
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
          data: {
            display_name: '山田太郎',
            role: 'parent'
          }
        }
      })
      
      expect(result).toEqual({ 
        success: true, 
        message: '確認メールを送信しました' 
      })
    })
  })
})
```

### 3. Client Components 単体テスト

#### __tests__/components/client/LoginForm.test.tsx
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/client/LoginForm'
import { signIn } from '@/lib/auth/actions'

jest.mock('@/lib/auth/actions')

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('フォーム要素が正しく表示される', () => {
    render(<LoginForm />)
    
    expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/パスワード/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ログイン/i })).toBeInTheDocument()
  })

  it('フォーム送信が正常に動作する', async () => {
    const user = userEvent.setup()
    ;(signIn as jest.Mock).mockResolvedValue({})
    
    render(<LoginForm />)
    
    await user.type(screen.getByLabelText(/メールアドレス/i), 'test@example.com')
    await user.type(screen.getByLabelText(/パスワード/i), 'password123')
    await user.click(screen.getByRole('button', { name: /ログイン/i }))
    
    await waitFor(() => {
      expect(signIn).toHaveBeenCalled()
    })
  })

  it('エラーメッセージが正しく表示される', async () => {
    const user = userEvent.setup()
    ;(signIn as jest.Mock).mockResolvedValue({ 
      error: 'Invalid credentials' 
    })
    
    render(<LoginForm />)
    
    await user.type(screen.getByLabelText(/メールアドレス/i), 'invalid@example.com')
    await user.type(screen.getByLabelText(/パスワード/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /ログイン/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('送信中は適切な状態が表示される', async () => {
    const user = userEvent.setup()
    let resolveSignIn: () => void
    const signInPromise = new Promise<void>((resolve) => {
      resolveSignIn = resolve
    })
    ;(signIn as jest.Mock).mockReturnValue(signInPromise)
    
    render(<LoginForm />)
    
    await user.type(screen.getByLabelText(/メールアドレス/i), 'test@example.com')
    await user.type(screen.getByLabelText(/パスワード/i), 'password123')
    await user.click(screen.getByRole('button', { name: /ログイン/i }))
    
    // 送信中の状態確認
    expect(screen.getByRole('button', { name: /ログイン中/i })).toBeDisabled()
    
    // 送信完了
    resolveSignIn!()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ログイン/i })).not.toBeDisabled()
    })
  })
})
```

### 4. E2E テスト (Playwright)

#### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### e2e/auth-flow.spec.ts
```typescript
import { test, expect } from '@playwright/test'

test.describe('認証フロー', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用データのクリーンアップ
    await page.goto('/api/test/cleanup')
  })

  test('保護者の新規登録からログインまで', async ({ page }) => {
    // 新規登録ページへ
    await page.goto('/register')
    
    // フォーム入力
    await page.fill('input[name="email"]', 'test-parent@example.com')
    await page.fill('input[name="password"]', 'SecurePass123!')
    await page.fill('input[name="displayName"]', 'テスト保護者')
    
    // 登録ボタンクリック
    await page.click('button[type="submit"]')
    
    // 確認メッセージ表示確認
    await expect(page.locator('text=確認メールを送信しました')).toBeVisible()
    
    // テスト環境では自動でメール確認済みにする
    await page.goto('/api/test/verify-email?email=test-parent@example.com')
    
    // ログインページへ
    await page.goto('/login')
    
    // ログイン実行
    await page.fill('input[name="email"]', 'test-parent@example.com')
    await page.fill('input[name="password"]', 'SecurePass123!')
    await page.click('button[type="submit"]')
    
    // ダッシュボードにリダイレクトされることを確認
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1:has-text("ダッシュボード")')).toBeVisible()
  })

  test('生徒ログイン機能', async ({ page }) => {
    // 事前に保護者アカウントと生徒を作成
    await page.goto('/api/test/setup-student?loginId=testuser001&password=pass123')
    
    // 生徒ログインページへ
    await page.goto('/student-login')
    
    // ログイン実行
    await page.fill('input[name="loginId"]', 'testuser001')
    await page.fill('input[name="password"]', 'pass123')
    await page.click('button[type="submit"]')
    
    // 生徒用ダッシュボードにリダイレクト
    await expect(page).toHaveURL('/student/dashboard')
    await expect(page.locator('text=testuser001')).toBeVisible()
  })

  test('無効な認証情報でのログイン試行', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // エラーメッセージ表示確認
    await expect(page.locator('text=Invalid login credentials')).toBeVisible()
    
    // ログインページに留まることを確認
    await expect(page).toHaveURL('/login')
  })

  test('認証ガードの動作確認', async ({ page }) => {
    // 未認証状態でダッシュボードにアクセス
    await page.goto('/dashboard')
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/login')
  })
})
```

#### e2e/migration-flow.spec.ts
```typescript
import { test, expect } from '@playwright/test'

test.describe('メール移管フロー', () => {
  test('保護者による移管申請から実行まで', async ({ page }) => {
    // 保護者アカウント作成・ログイン
    await page.goto('/api/test/create-parent?email=parent@example.com')
    await page.goto('/login')
    await page.fill('input[name="email"]', 'parent@example.com')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    
    // 移管ページへ
    await page.goto('/migration')
    
    // 移管申請フォーム入力
    await page.fill('input[name="newEmail"]', 'new-parent@example.com')
    await page.fill('textarea[name="reason"]', '実際のメールアドレスに変更したいため')
    await page.click('button[type="submit"]:has-text("移管申請を送信")')
    
    // 申請完了メッセージ確認
    await expect(page.locator('text=移管申請を受け付けました')).toBeVisible()
    
    // 管理者でログイン
    await page.goto('/api/test/create-admin')
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@example.com')
    await page.fill('input[name="password"]', 'AdminPass123!')
    await page.click('button[type="submit"]')
    
    // 管理者の移管管理ページへ
    await page.goto('/admin/migration')
    
    // 申請一覧に表示されることを確認
    await expect(page.locator('text=new-parent@example.com')).toBeVisible()
    
    // 申請を承認
    await page.click('button:has-text("承認")')
    await expect(page.locator('text=承認済み')).toBeVisible()
    
    // 移管実行
    await page.click('button:has-text("実行")')
    await expect(page.locator('text=完了')).toBeVisible()
    
    // 移管後のログイン確認
    await page.click('button:has-text("ログアウト")')
    await page.goto('/login')
    
    // 新しいメールアドレスでログイン
    await page.fill('input[name="email"]', 'new-parent@example.com')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    
    // ダッシュボードにアクセスできることを確認
    await expect(page).toHaveURL('/dashboard')
  })
})
```

### 5. パフォーマンステスト

#### __tests__/performance/auth.test.ts
```typescript
import { performance } from 'perf_hooks'

describe('認証パフォーマンステスト', () => {
  test('ログイン処理のレスポンス時間', async () => {
    const iterations = 10
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      
      // ログイン処理のシミュレーション
      await simulateLogin()
      
      const end = performance.now()
      times.push(end - start)
    }
    
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length
    const maxTime = Math.max(...times)
    
    // 平均レスポンス時間が500ms以下であることを確認
    expect(averageTime).toBeLessThan(500)
    
    // 最大レスポンス時間が1000ms以下であることを確認
    expect(maxTime).toBeLessThan(1000)
    
    console.log(`平均レスポンス時間: ${averageTime.toFixed(2)}ms`)
    console.log(`最大レスポンス時間: ${maxTime.toFixed(2)}ms`)
  })
})

async function simulateLogin() {
  // 実際のログイン処理をシミュレート
  return new Promise(resolve => {
    setTimeout(resolve, Math.random() * 200 + 100)
  })
}
```

## 受け入れ基準
- [ ] 全ての単体テストが通過する（カバレッジ80%以上）
- [ ] 統合テストが正常に動作する
- [ ] E2Eテストで全ての主要フローが確認できる
- [ ] パフォーマンステストで基準値をクリアする
- [ ] セキュリティテストで脆弱性が検出されない
- [ ] CI/CDパイプラインでテストが自動実行される

## CI/CD統合

### GitHub Actions ワークフロー
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test
      
      - name: Run E2E tests
        run: npx playwright test
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

## 関連チケット
- [01-authentication-setup.md](./01-authentication-setup.md) - 認証基盤セットアップ
- [05-email-migration.md](./05-email-migration.md) - メール移管機能

## 注意点
- テストデータの適切なクリーンアップ
- 本番データへの影響防止
- テスト実行環境の分離
- セキュリティテスト結果の適切な管理