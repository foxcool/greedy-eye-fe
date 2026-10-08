import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HealthCell, HealthNotice } from './account-health'
import type { AccountHealth, AccountHealthResponse } from '@/lib/api/backend-types'

const degraded: AccountHealth = {
  accountId: 'dot',
  accountName: 'dot-controller',
  state: 'HEALTH_STATE_DEGRADED',
  reasons: [
    {
      kind: 'HEALTH_REASON_KIND_CHAIN_FAILING',
      message: 'hydration has failed 13 sync(s) in a row; its balances are not refreshed',
      detail: 'subscan API status 404 for hydration',
    },
  ],
}

// The state is the server's; the cell only shows it. A problem is a badge that
// opens to the server's own reasons, health is quiet, and no answer is a dash
// rather than a reassuring OK.
describe('HealthCell', () => {
  it('says nothing reassuring when there is no health to show', () => {
    render(<HealthCell />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('OK')).not.toBeInTheDocument()
  })

  it('keeps a healthy account quiet', () => {
    render(<HealthCell health={{ accountId: 'a', accountName: 'a', state: 'HEALTH_STATE_OK' }} />)
    expect(screen.getByText('OK')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('opens a problem to the reasons the server wrote', () => {
    render(<HealthCell health={degraded} />)
    const badge = screen.getByRole('button', { name: 'Degraded' })
    expect(screen.queryByText(/hydration has failed/)).not.toBeInTheDocument()

    fireEvent.click(badge)
    expect(badge).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/hydration has failed 13 sync\(s\)/)).toBeInTheDocument()
    expect(screen.getByText('subscan API status 404 for hydration')).toBeInTheDocument()
  })

  it('shows a disabled account as its owner\'s choice, with since when', () => {
    render(
      <HealthCell
        health={{
          accountId: 'off',
          accountName: 'lapsed',
          state: 'HEALTH_STATE_DISABLED',
          reasons: [{ kind: 'HEALTH_REASON_KIND_DISABLED', message: 'disabled by its owner', since: '2026-10-08T05:08:34Z' }],
        }}
      />
    )
    const badge = screen.getByRole('button', { name: 'Disabled' })
    expect(badge.className).not.toMatch(/red|yellow/)
    fireEvent.click(badge)
    expect(screen.getByText(/disabled by its owner — since/)).toBeInTheDocument()
  })

  it('names an unusable account as such', () => {
    render(<HealthCell health={{ ...degraded, state: 'HEALTH_STATE_UNUSABLE' }} />)
    expect(screen.getByRole('button', { name: 'Unusable' })).toBeInTheDocument()
  })
})

// The notice says what rows cannot: that health was not read at all, that this
// instance cannot judge sources, or which shared sources are down.
describe('HealthNotice', () => {
  it('says health is unknown when the server did not answer', () => {
    render(<HealthNotice failed />)
    expect(screen.getByRole('status')).toHaveTextContent('Account health is unknown')
  })

  it('does not read unknown sources as fine', () => {
    render(<HealthNotice failed={false} data={{ accounts: [], sourcesState: 'HEALTH_STATE_UNKNOWN' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Price source health is unknown')
  })

  it('names a source that is down, with when it comes back', () => {
    const data: AccountHealthResponse = {
      sourcesState: 'HEALTH_STATE_UNUSABLE',
      sources: [
        { provider: 'moex', state: 'HEALTH_STATE_OK' },
        {
          provider: 'coingecko',
          state: 'HEALTH_STATE_UNUSABLE',
          reasons: [{ kind: 'HEALTH_REASON_KIND_PROVIDER_PAUSED', message: 'plan spent', until: '2026-11-01T00:00:00Z' }],
        },
      ],
    }
    render(<HealthNotice failed={false} data={data} />)
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent('Price source coingecko: unusable')
    expect(notice).toHaveTextContent('plan spent — next try')
    expect(notice).not.toHaveTextContent('moex')
  })

  it('stays out of the way when every source works', () => {
    const { container } = render(
      <HealthNotice failed={false} data={{ sourcesState: 'HEALTH_STATE_OK', sources: [{ provider: 'moex', state: 'HEALTH_STATE_OK' }] }} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
