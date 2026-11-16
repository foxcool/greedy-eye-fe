import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Asset } from '@/lib/api/backend-types'
import { AssetCell } from './asset-cell'

vi.mock('@/lib/config/data-source', () => ({ DEMO_MODE: false, USE_BACKEND: true }))

const address = '0xAbCd00000000000000000000000000000000Ef12'

function asset(symbol: string): Asset {
  return {
    id: 'a1',
    symbol,
    name: symbol,
    type: 'ASSET_TYPE_CRYPTOCURRENCY',
    tags: [`contract:${address}`],
    createdAt: '',
    updatedAt: '',
  }
}

describe('AssetCell', () => {
  it('shows the full contract, copyable and linked, next to a label cut from it', () => {
    const a = asset('0xAbCd..Ef12')
    render(<AssetCell assetId={a.id} asset={a} symbol={a.symbol!} name={a.name} />)

    expect(screen.getByText(address)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    // The tag carries no chain, so the link searches every explorer.
    expect(screen.getByRole('link', { name: 'Contract on a block explorer' })).toHaveAttribute(
      'href',
      `https://blockscan.com/address/${address}`
    )
  })

  it('keeps a real ticker to its symbol and name', () => {
    const a = asset('USDC')
    render(<AssetCell assetId={a.id} asset={a} symbol={a.symbol!} name="USD Coin" />)

    expect(screen.getByText('USDC')).toBeInTheDocument()
    expect(screen.queryByText(address)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument()
  })
})
