'use client'

import { useMemo, useState } from 'react'
import { Heatmap } from '@/components/heatmap/heatmap'
import { usePortfolioHeatmap } from '@/hooks/use-heatmap'
import type { HeatmapNode, HeatmapWindow } from '@/lib/api/backend-types'
import { DEMO_MODE } from '@/lib/config/data-source'
import { cn } from '@/lib/utils'

const WINDOWS: { value: HeatmapWindow; label: string }[] = [
  { value: 'HEATMAP_WINDOW_24H', label: '24h' },
  { value: 'HEATMAP_WINDOW_7D', label: '7d' },
  { value: 'HEATMAP_WINDOW_30D', label: '30d' },
]

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

export function PortfolioHeatmap() {
  const [window, setWindow] = useState<HeatmapWindow>('HEATMAP_WINDOW_24H')
  const [byAccount, setByAccount] = useState(false)

  // Grouping is presentation-side in demo mode (mock data has no accounts).
  const groupBy = byAccount && !DEMO_MODE ? 'HEATMAP_GROUP_BY_ACCOUNT' : undefined
  const { data, isLoading, error } = usePortfolioHeatmap({ groupBy, window })

  const nodes = useMemo(() => data?.nodes ?? [], [data])
  const groups = useMemo(() => (groupBy ? splitGroups(nodes) : []), [nodes, groupBy])

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 h-80">
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

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Performance map</h3>
        <div className="flex items-center gap-3">
          {!DEMO_MODE && (
            <div className="flex items-center gap-1">
              <ToggleButton active={!byAccount} onClick={() => setByAccount(false)}>
                All
              </ToggleButton>
              <ToggleButton active={byAccount} onClick={() => setByAccount(true)}>
                By account
              </ToggleButton>
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

      {groupBy && groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.id}>
              <p className="text-xs text-muted-foreground mb-1">{group.label}</p>
              <div style={{ height: Math.max(120, Math.min(288, group.leaves.length * 60)) }}>
                <Heatmap nodes={group.leaves} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-72">
          <Heatmap nodes={nodes} />
        </div>
      )}
    </div>
  )
}
