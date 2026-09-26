'use client'

import { useMemo } from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import type { HeatmapNode } from '@/lib/api/backend-types'
import { formatCurrency } from '@/lib/mocks'

// Change % beyond which the tile color saturates (coin360 convention).
const COLOR_CLAMP = 8

interface TileDatum {
  id: string
  /** Tile identity: recharts keys a tile by position and name, so this is the
   *  node id — two same-ticker tiles at one point would otherwise collide. */
  name: string
  /** What the tile says: the symbol, which two assets may share. */
  label: string
  size: number
  colorValue: number
  price?: number
  assetId?: string
  [key: string]: string | number | undefined
}

// Tile fill interpolates between the card background and the market
// up/down tokens, so the map follows both style and scheme automatically.
function tileFill(change: number): string {
  const clamped = Math.max(-COLOR_CLAMP, Math.min(COLOR_CLAMP, change))
  if (Math.abs(clamped) < 0.05) {
    return 'color-mix(in oklab, var(--muted) 70%, var(--card))'
  }
  const tone = clamped > 0 ? 'var(--ge-up)' : 'var(--ge-down)'
  const strength = 25 + (Math.abs(clamped) / COLOR_CLAMP) * 55
  return `color-mix(in oklab, ${tone} ${strength}%, var(--card))`
}

function tileText(change: number): string {
  // Saturated tiles get white text; pale ones keep the theme foreground.
  return Math.abs(change) > 4 ? '#FFFFFF' : 'var(--foreground)'
}

function formatChange(change: number): string {
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

interface TileProps {
  x?: number
  y?: number
  width?: number
  height?: number
  label?: string
  colorValue?: number
  assetId?: string
  onLeafClick?: LeafClickHandler
}

/**
 * The event travels with the id so the caller can honour cmd/ctrl-click: an SVG
 * tile has no <a> the browser would open in a new tab by itself.
 */
export type LeafClickHandler = (
  assetId: string,
  e: React.MouseEvent | React.KeyboardEvent
) => void

function HeatTile(props: TileProps) {
  const { x = 0, y = 0, width = 0, height = 0, label, colorValue = 0, assetId, onLeafClick } = props
  if (width <= 0 || height <= 0) return null

  const showLabel = width > 52 && height > 26
  const showChange = showLabel && height > 44
  const clickable = Boolean(assetId && onLeafClick)

  // Focusable and Enter-activated, so the map is not a mouse-only way in. The
  // label is the tile's symbol; the tooltip that carries the numbers is hover-only.
  return (
    <g
      onClick={clickable ? (e) => onLeafClick!(assetId!, e) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter') onLeafClick!(assetId!, e)
            }
          : undefined
      }
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'link' : undefined}
      aria-label={clickable ? `Open ${label ?? 'asset'}` : undefined}
      className={clickable ? 'cursor-pointer outline-none [&:focus-visible>rect]:stroke-[var(--ring)] [&:focus-visible>rect]:stroke-2 hover:opacity-90' : undefined}
    >
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(width - 2, 0)}
        height={Math.max(height - 2, 0)}
        rx={2}
        fill={tileFill(colorValue)}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 + (showChange ? -4 : 4)}
          textAnchor="middle"
          fill={tileText(colorValue)}
          fontSize={Math.min(14, Math.max(10, width / 8))}
          fontWeight={600}
        >
          {label}
        </text>
      )}
      {showChange && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 14}
          textAnchor="middle"
          fill={tileText(colorValue)}
          fontSize={11}
          opacity={0.85}
        >
          {formatChange(colorValue)}
        </text>
      )}
    </g>
  )
}

interface TooltipEntry {
  payload?: TileDatum
}

function HeatTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const datum = payload?.[0]?.payload
  if (!active || !datum) return null
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{datum.label}</p>
      <p className="text-muted-foreground tabular-nums">{formatCurrency(datum.size)}</p>
      <p className="tabular-nums" style={{ color: datum.colorValue >= 0 ? 'var(--ge-up)' : 'var(--ge-down)' }}>
        {formatChange(datum.colorValue)}
      </p>
      {datum.price !== undefined && (
        <p className="text-xs text-muted-foreground tabular-nums">
          price {formatCurrency(datum.price)}
        </p>
      )}
    </div>
  )
}

export interface HeatmapProps {
  /** Leaf nodes only (parentId is ignored — group presentation is the caller's job). */
  nodes: HeatmapNode[]
  height?: number | `${number}%`
  onLeafClick?: LeafClickHandler
}

/**
 * Flat treemap: tile size = node.size, tile color = node.colorValue
 * (signed change %, red↔green through the design tokens).
 */
export function Heatmap({ nodes, height = '100%', onLeafClick }: HeatmapProps) {
  const data: TileDatum[] = useMemo(
    () =>
      nodes
        .filter(n => (n.size ?? 0) > 0)
        .map(n => ({
          id: n.id,
          name: n.id,
          label: n.label ?? n.id,
          size: n.size ?? 0,
          colorValue: n.colorValue ?? 0,
          price: n.price,
          assetId: n.assetId,
        })),
    [nodes]
  )

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No priced holdings to display
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={data}
        dataKey="size"
        stroke="none"
        isAnimationActive={false}
        content={<HeatTile onLeafClick={onLeafClick} />}
      >
        <Tooltip content={<HeatTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  )
}
