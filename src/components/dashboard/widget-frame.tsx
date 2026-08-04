'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Settings2, X } from 'lucide-react'
import type { Portfolio } from '@/lib/api/backend-types'
import {
  WIDGET_DEFINITIONS,
  type WidgetInstance,
  type WidgetParams,
  type WidgetSize,
} from '@/lib/config/dashboard-widgets'
import { PortfolioScopeProvider } from '@/lib/portfolio-scope'
import { cn } from '@/lib/utils'
import { WidgetParamsForm } from './widget-params-form'

const SIZES: WidgetSize[] = ['s', 'm', 'l']

interface WidgetFrameProps {
  instance: WidgetInstance
  editing: boolean
  first: boolean
  last: boolean
  portfolios: Portfolio[]
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
  onSize: (size: WidgetSize) => void
  onParams: (params: WidgetParams) => void
  children: React.ReactNode
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
    >
      {children}
    </button>
  )
}

/**
 * One widget instance in the grid: the edit toolbar, its settings form, and the
 * portfolio scope it renders under.
 *
 * The frame draws no card of its own. Every widget already brings one, and a
 * border around a border reads as a nesting that is not there.
 *
 * Scope is injected as context rather than passed as a prop because that is how
 * the portfolio components already take it — usePortfolio and
 * usePortfolioHeatmap read it directly, so a widget instance pointed at one
 * portfolio needs no new plumbing through the components it reuses.
 */
export function WidgetFrame({
  instance,
  editing,
  first,
  last,
  portfolios,
  onMove,
  onRemove,
  onSize,
  onParams,
  children,
}: WidgetFrameProps) {
  const [showSettings, setShowSettings] = useState(false)
  const definition = WIDGET_DEFINITIONS[instance.type]
  const scopedPortfolioId = instance.params.portfolioId || undefined

  return (
    <div className="flex flex-col gap-2">
      {editing && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-2 py-1">
          <span className="truncate text-xs text-muted-foreground">{definition.title}</span>
          <div className="flex items-center gap-1">
            <div className="mr-1 flex items-center gap-0.5">
              {SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSize(size)}
                  aria-label={`Size ${size.toUpperCase()}`}
                  aria-pressed={instance.size === size}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] uppercase transition-colors',
                    instance.size === size
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
            <IconButton label="Move up" disabled={first} onClick={() => onMove(-1)}>
              <ChevronUp size={14} />
            </IconButton>
            <IconButton label="Move down" disabled={last} onClick={() => onMove(1)}>
              <ChevronDown size={14} />
            </IconButton>
            <IconButton
              label="Widget settings"
              disabled={definition.fields.length === 0}
              onClick={() => setShowSettings(v => !v)}
            >
              <Settings2 size={14} />
            </IconButton>
            <IconButton label="Remove widget" onClick={onRemove}>
              <X size={14} />
            </IconButton>
          </div>
        </div>
      )}

      {editing && showSettings && (
        <div className="rounded-md border border-border p-3">
          <WidgetParamsForm
            fields={definition.fields}
            params={instance.params}
            portfolios={portfolios}
            onChange={onParams}
          />
        </div>
      )}

      <PortfolioScopeProvider portfolioId={scopedPortfolioId}>{children}</PortfolioScopeProvider>
    </div>
  )
}
