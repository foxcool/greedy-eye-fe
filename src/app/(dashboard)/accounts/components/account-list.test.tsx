import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AccountList } from './account-list'

vi.mock('@/lib/auth/auth-context', () => ({ useAuth: () => ({ isAdmin: false }) }))

const accounts = [
  { id: 'live', userId: 'u', name: 'binance', type: 'ACCOUNT_TYPE_EXCHANGE', createdAt: '', updatedAt: '' },
  { id: 'off', userId: 'u', name: 'lapsed moralis', type: 'ACCOUNT_TYPE_WALLET', disabled: true, disabledAt: '2026-10-08T05:00:00Z', createdAt: '', updatedAt: '' },
  { id: 'hand', userId: 'u', name: 'xmr', type: 'ACCOUNT_TYPE_MANUAL', createdAt: '', updatedAt: '' },
]

function requestsTo(method: string) {
  return vi.mocked(fetch).mock.calls
    .filter(([input]) => String(input).endsWith(`/${method}`))
    .map(([, init]) => JSON.parse(String(init?.body)))
}

beforeEach(() => {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input)
    const body = url.endsWith('/ListAccounts') ? { accounts }
      : url.endsWith('/GetAccountHealth') ? { accounts: [], sourcesState: 'HEALTH_STATE_OK' }
      : url.endsWith('/UpdateAccount') ? { id: 'live', disabled: true }
      : {}
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
})

function renderList() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AccountList />
    </QueryClientProvider>
  )
}

// Standing an account down is a gesture of its own in the row: a disabled row
// is greyed and offers no Sync, an active one offers Disable, and a manual
// account — nothing external to stop — offers neither.
describe('AccountList disable', () => {
  it('greys a disabled row, hides its Sync and offers Enable', async () => {
    renderList()
    const row = (await screen.findByText('lapsed moralis')).closest('tr')!
    expect(row).toHaveAttribute('data-disabled', 'true')
    expect(within(row).queryByRole('button', { name: 'Sync' })).not.toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Enable' })).toBeInTheDocument()

    const manual = screen.getByText('xmr').closest('tr')!
    expect(within(manual).queryByRole('button', { name: /Disable|Enable/ })).not.toBeInTheDocument()
  })

  it('disables an active account with the flag alone', async () => {
    renderList()
    const row = (await screen.findByText('binance')).closest('tr')!
    expect(row).not.toHaveAttribute('data-disabled')
    fireEvent.click(within(row).getByRole('button', { name: 'Disable' }))

    await waitFor(() => expect(requestsTo('UpdateAccount')).toHaveLength(1))
    expect(requestsTo('UpdateAccount')[0]).toEqual({ account: { id: 'live', disabled: true }, updateMask: 'disabled' })
  })

  it('enables a disabled one by naming false', async () => {
    renderList()
    const row = (await screen.findByText('lapsed moralis')).closest('tr')!
    fireEvent.click(within(row).getByRole('button', { name: 'Enable' }))

    await waitFor(() => expect(requestsTo('UpdateAccount')).toHaveLength(1))
    expect(requestsTo('UpdateAccount')[0]).toEqual({ account: { id: 'off', disabled: false }, updateMask: 'disabled' })
  })
})
