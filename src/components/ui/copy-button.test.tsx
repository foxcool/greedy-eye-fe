import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CopyButton } from './copy-button'

function stubClipboard(writeText: (v: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

describe('CopyButton', () => {
  it('says it copied', async () => {
    const writeText = vi.fn(async () => {})
    stubClipboard(writeText)
    render(<CopyButton value="0xabc" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith('0xabc')
  })

  it('says so when the clipboard refuses', async () => {
    stubClipboard(async () => { throw new Error('NotAllowedError') })
    render(<CopyButton value="0xabc" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await screen.findByRole('button', { name: 'Copy failed' })).toBeInTheDocument()
  })
})
