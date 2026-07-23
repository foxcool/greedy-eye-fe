'use client'

import { useMemo, useState } from 'react'
import { Heatmap } from './heatmap'
import type { HeatmapGroupBy, HeatmapNode, HeatmapWindow } from '@/lib/api/backend-types'
import type { HeatmapOptions, HeatmapResult } from '@/hooks/use-heatmap'
import { DEMO_MODE } from '@/lib/config/data-source'
import { cn } from '@/lib/utils'

const WINDOWS: { value: HeatmapWindow; label: string }[] = [
  { value: 'HEATMAP_WINDOW_24H', label: '24h' },
  { value: 'HEATMAP_WINDOW_7D', label: '7d' },
  { value: 'HEATMAP_WINDOW_30D', label: '30d' },
]

export interface GroupOption {
  value: HeatmapGroupBy
  label: string
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2 py-0.5 rounded text-xs transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

interface Group {
  id: string
  label: string
  size: number
  leaves: HeatmapNode[]
}

// Group leaves under their parent nodes, ordered by group size desc
// (the backend emits parents first, already sorted).
function splitGroups(nodes: HeatmapNode[]): Group[] {
  const groups = new Map<string, Group>()
  for (const n of nodes) {
    if (!n.parentId && !n.assetId) {
      groups.set(n.id, { id: n.id, label: n.label ?? n.id, size: n.size ?? 0, leaves: [] })
    }
  }
  for (const n of nodes) {
    if (n.parentId) groups.get(n.parentId)?.leaves.push(n)
  }
  return [...groups.values()].filter(g => g.leaves.length > 0)
}

export interface HeatmapCardProps {
  title: string
  useData: (opts: HeatmapOptions) => HeatmapResult
  /** Extra grouping dimensions offered beside "All" (hidden in demo mode). */
  groupOptions?: GroupOption[]
  /** Flat treemap height in px. */
  height?: number
  onLeafClick?: (assetId: string) => void
}

export function HeatmapCard({
  title,
  useData,
  groupOptions = [],
  height = 384,
  onLeafClick,
}: HeatmapCardProps) {
  const [window, setWindow] = useState<HeatmapWindow>('HEATMAP_WINDOW_24H')
  const [groupBy, setGroupBy] = useState<HeatmapGroupBy | undefined>(undefined)

  // Grouping is a real backend dimension; the demo has no accounts/portfolios,
  // so it stays flat regardless of the toggle (which is hidden in demo).
  const activeGroupBy = groupBy && !DEMO_MODE ? groupBy : undefined
  const { data, isLoading, error } = useData({ groupBy: activeGroupBy, window })

  const nodes = useMemo(() => data?.nodes ?? [], [data])
  const groups = useMemo(() => (activeGroupBy ? splitGroups(nodes) : []), [nodes, activeGroupBy])

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6" style={{ height: height + 96 }}>
        <div className="animate-pulse h-full rounded bg-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <p className="text-destructive">Failed to load heatmap</p>
      </div>
    )
  }

  const showGroups = groupOptions.length > 0 && !DEMO_MODE

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="flex items-center gap-3">
          {showGroups && (
            <div className="flex items-center gap-1">
              <ToggleButton active={!groupBy} onClick={() => setGroupBy(undefined)}>
                All
              </ToggleButton>
              {groupOptions.map(g => (
                <ToggleButton
                  key={g.value}
                  active={groupBy === g.value}
                  onClick={() => setGroupBy(g.value)}
                >
                  {g.label}
                </ToggleButton>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1">
            {WINDOWS.map(w => (
              <ToggleButton key={w.value} active={window === w.value} onClick={() => setWindow(w.value)}>
                {w.label}
              </ToggleButton>
            ))}
          </div>
        </div>
      </div>

      {activeGroupBy && groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.id}>
              <p className="text-xs text-muted-foreground mb-1">{group.label}</p>
              <div style={{ height: Math.max(140, Math.min(320, group.leaves.length * 64)) }}>
                <Heatmap nodes={group.leaves} onLeafClick={onLeafClick} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ height }}>
          <Heatmap nodes={nodes} onLeafClick={onLeafClick} />
        </div>
      )}
    </div>
  )
}
