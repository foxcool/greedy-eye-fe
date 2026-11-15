import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HoldingsManager } from './holdings-manager'
import type { Account, Holding } from '@/lib/api/backend-types'

const accounts = [
  {
    id: 'acc-1',
    name: 'eth main',
    type: 'ACCOUNT_TYPE_WALLET',
    data: { address: '0x1234567890abcdef1234567890abcdef12345678' },
  },
] as unknown as Account[]
const holdings = [
  { id: 'h1', assetId: 'eth', accountId: 'acc-1', amount: '2', decimals: 0 },
] as Holding[]

vi.mock('@/hooks/use-holdings', () => ({
  useHoldingsQuery: () => ({ data: holdings, isLoading: false }),
  useCreateHolding: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateHolding: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteHolding: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/use-accounts', () => ({
  useAccounts: () => ({ data: accounts, isLoading: false }),
}))
vi.mock('@/hooks/use-assets', () => ({
  useAssetsByIds: () => ({ data: [{ id: 'eth', symbol: 'ETH', name: 'Ether' }], isLoading: false }),
}))
vi.mock('./holding-form', () => ({ HoldingForm: () => null }))

describe('HoldingsManager account group header', () => {
  it('names the account, links to it in Settings, and shows no type or address', () => {
    render(<HoldingsManager portfolioId="p1" />)

    const link = screen.getByRole('link', { name: 'eth main' })
    expect(link).toHaveAttribute('href', '/settings#account-acc-1')
    expect(screen.queryByText('Wallet')).not.toBeInTheDocument()
    expect(screen.queryByText(/0x1234/)).not.toBeInTheDocument()
  })
})
