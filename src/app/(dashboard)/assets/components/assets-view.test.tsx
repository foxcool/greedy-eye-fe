import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssetsView } from './assets-view'

let isAdmin = false
vi.mock('@/lib/auth/auth-context', () => ({ useAuth: () => ({ isAdmin }) }))
vi.mock('@/lib/config/data-source', () => ({ DEMO_MODE: false, USE_BACKEND: true }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/assets',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/hooks/use-held-assets', () => ({
  useHeldAssets: () => ({ data: [], totalValue: 0, isLoading: false, isValuing: false, error: null }),
}))

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AssetsView />
    </QueryClientProvider>
  )
}

// Catalogue rows are created by admins and sync only; the backend enforces it,
// the page just must not offer what will be refused.
describe('AssetsView create entry point', () => {
  it('offers Add asset to an admin', () => {
    isAdmin = true
    renderView()
    expect(screen.getByRole('button', { name: 'Add asset' })).toBeInTheDocument()
  })

  it('hides Add asset from a non-admin', () => {
    isAdmin = false
    renderView()
    expect(screen.queryByRole('button', { name: 'Add asset' })).not.toBeInTheDocument()
  })
})
