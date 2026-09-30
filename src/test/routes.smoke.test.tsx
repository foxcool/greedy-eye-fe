import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, type ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth/auth-context'

// Every route renders against a backend that answers each RPC with an empty
// message — no portfolios, no holdings, no assets. That is a new instance's
// first screen, and the state least exercised by the author's own data.
//
// The check is deliberately shallow: the page mounts, fetches, and settles
// without throwing. What a page SHOWS is for the tests beside its components.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: '00000000-0000-7000-8000-000000000001' }),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_BACKEND', 'true')
  vi.stubEnv('NEXT_PUBLIC_MOCK_USER_ID', '00000000-0000-7000-8000-00000000000a')
  vi.stubEnv('NEXT_PUBLIC_API_URL', '')
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

// Per test: restoreMocks resets the fetch guard's implementation after each.
beforeEach(() => {
  vi.mocked(fetch).mockImplementation(async () =>
    new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
})

type PageModule = { default: (props: { params: Promise<{ id: string }> }) => ReactNode }

const routes: Record<string, () => Promise<PageModule>> = {
  '/': () => import('@/app/(dashboard)/page'),
  '/portfolios': () => import('@/app/(dashboard)/portfolios/page'),
  '/portfolios/[id]': () => import('@/app/(dashboard)/portfolios/[id]/page'),
  '/assets': () => import('@/app/(dashboard)/assets/page'),
  '/assets/[id]': () => import('@/app/(dashboard)/assets/[id]/page'),
  '/prices': () => import('@/app/(dashboard)/prices/page'),
  '/rules': () => import('@/app/(dashboard)/rules/page'),
  '/settings': () => import('@/app/(dashboard)/settings/page'),
  '/login': () => import('@/app/login/page'),
}

describe('every route renders on an empty instance', () => {
  for (const [path, load] of Object.entries(routes)) {
    it(path, async () => {
      const { default: Page } = await load()
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      // Next hands a page an already-settled params promise; React reads one
      // marked fulfilled synchronously instead of suspending on it.
      const value = { id: '00000000-0000-7000-8000-000000000001' }
      const params = Object.assign(Promise.resolve(value), { status: 'fulfilled', value })
      const errors: unknown[] = []
      const onError = (e: ErrorEvent) => errors.push(e.error)
      window.addEventListener('error', onError)

      const { container } = render(
        <QueryClientProvider client={client}>
          <AuthProvider>
            <Suspense fallback={null}>
              <Page params={params} />
            </Suspense>
          </AuthProvider>
        </QueryClientProvider>
      )
      await waitFor(() => {
        expect(client.isFetching()).toBe(0)
        expect(container.textContent?.length ?? 0).toBeGreaterThan(0)
      })
      window.removeEventListener('error', onError)

      expect(errors).toEqual([])
      expect(container.textContent?.length ?? 0).toBeGreaterThan(0)
      expect(screen.queryByText(/something went wrong/i), `${path} rendered its error boundary`).toBeNull()
    })
  }
})
