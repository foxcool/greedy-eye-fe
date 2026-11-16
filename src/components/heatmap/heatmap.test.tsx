import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { HeatTile } from './heatmap'

function renderTile(props: Parameters<typeof HeatTile>[0]) {
  return render(<svg><HeatTile {...props} /></svg>)
}

describe('HeatTile', () => {
  it('draws nothing for the treemap root', () => {
    // The root spans the whole map; drawn, it put "+0.0%" in its middle.
    const { container } = renderTile({ x: 0, y: 0, width: 800, height: 400, depth: 0 })
    expect(container.querySelector('g')).toBeNull()
  })

  it('draws a tile with its symbol and change', () => {
    const { container } = renderTile({ x: 0, y: 0, width: 200, height: 100, depth: 1, label: 'BTC', colorValue: 2.1 })
    expect(container.textContent).toBe('BTC+2.1%')
  })
})
