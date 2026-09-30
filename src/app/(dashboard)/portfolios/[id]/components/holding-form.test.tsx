import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HoldingForm } from './holding-form'
import type { Account, Asset, Holding } from '@/lib/api/backend-types'

const asset = { id: 'as1', symbol: 'TKN', name: 'Token' } as Asset
const account = { id: 'ac1', name: 'hot' } as Account
const held: Holding = {
  id: 'h1',
  amount: '1234567890123456789012', // 1234.567890123456789012 at 18 decimals
  decimals: 18,
  assetId: 'as1',
  accountId: 'ac1',
  createdAt: '2026-09-30T00:00:00Z',
  updatedAt: '2026-09-30T00:00:00Z',
}

function renderForm(onSubmit = vi.fn()) {
  render(
    <HoldingForm open onOpenChange={() => {}} onSubmit={onSubmit} initial={held} assets={[asset]} accounts={[account]} />
  )
  return onSubmit
}

// The first thing a person does with a holding form is open it and press Save.
// That must send back what it read: through a float, an 18-decimal amount over
// 1000 units went out as "1.2345678901234568e+21".
describe('HoldingForm', () => {
  it('shows the amount exactly and an unedited save sends it back unchanged', async () => {
    const onSubmit = renderForm()
    expect(screen.getByLabelText(/Amount/)).toHaveValue(1234.567890123456789012)
    expect((screen.getByLabelText(/Amount/) as HTMLInputElement).value).toBe('1234.567890123456789012')

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledWith({
      assetId: 'as1',
      accountId: 'ac1',
      amountRaw: '1234567890123456789012',
      decimals: 18,
    })
  })

  it('refuses more fraction digits than the asset carries instead of rounding', async () => {
    const onSubmit = renderForm()
    // fireEvent, not userEvent.type: jsdom re-serialises a number input
    // through Number on each keystroke, which a browser does not — it keeps
    // the string as typed, and that string is what the form reads.
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '0.1234567890123456789' } })

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/at most 18 digits/)).toBeInTheDocument()
  })
})
