'use client'

import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardConfig } from '@/hooks/use-dashboard-config'
import { usePortfolios } from '@/hooks/use-portfolios'
import {
  WIDGET_DEFINITIONS,
  newInstance,
  renumber,
  type WidgetId,
  type WidgetInstance,
  type WidgetParams,
  type WidgetSize,
} from '@/lib/config/dashboard-widgets'
import { DEMO_MODE } from '@/lib/config/data-source'
import { AddWidgetMenu } from './add-widget-menu'
import { UNAVAILABLE_WIDGET, WIDGET_COMPONENTS } from './widget-registry'
import { WidgetFrame } from './widget-frame'

/**
 * Column spans per size preset. Written out as whole class names because
 * Tailwind scans source text — a computed `col-span-${n}` produces no CSS.
 */
const SPAN: Record<WidgetSize, string> = {
  s: 'md:col-span-1 xl:col-span-2',
  m: 'md:col-span-1 xl:col-span-3',
  l: 'md:col-span-2 xl:col-span-6',
}

export function DashboardView() {
  const { config, isLoading, saveError, save } = useDashboardConfig()
  const { data: portfolios = [] } = usePortfolios()
  const [editing, setEditing] = useState(false)

  const widgets = config.widgets

  const commit = (next: WidgetInstance[]) => save({ version: 1, widgets: renumber(next) })

  const add = (type: WidgetId) => commit([...widgets, newInstance(type, widgets.length)])

  const remove = (id: string) => commit(widgets.filter(w => w.id !== id))

  const patch = (id: string, changes: Partial<WidgetInstance>) =>
    commit(widgets.map(w => (w.id === id ? { ...w, ...changes } : w)))

  // Reorder by swapping with the neighbour: with order renumbered on every
  // commit, a swap of two adjacent positions is the whole operation.
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= widgets.length) return
    const next = [...widgets]
    ;[next[index], next[target]] = [next[target], next[index]]
    commit(next.map((w, i) => ({ ...w, order: i })))
  }

  /** The portfolio's own name where the instance names one, so two heatmaps are told apart. */
  const titleOf = (instance: WidgetInstance): string => {
    const definition = WIDGET_DEFINITIONS[instance.type]
    const scoped = portfolios.find(p => p.id === instance.params.portfolioId)
    return scoped ? `${definition.title} · ${scoped.name}` : definition.title
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
          {editing && <AddWidgetMenu onAdd={add} />}
          <Button variant={editing ? 'default' : 'outline'} size="sm" onClick={() => setEditing(v => !v)}>
            {editing ? <Check size={14} className="mr-1" /> : <Pencil size={14} className="mr-1" />}
            {editing ? 'Done' : 'Edit'}
          </Button>
        </div>
      </div>

      {saveError && (
        // The layout on screen is ahead of the stored one. Saying so beats a
        // silent divergence the user only discovers on the next device.
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not save the layout. It will look like this until you reload.
        </p>
      )}

      {widgets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No widgets. Use <span className="font-medium">Edit</span> to add one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
          {widgets.map((instance, index) => {
            const definition = WIDGET_DEFINITIONS[instance.type]
            const Widget =
              definition.demoOnly && !DEMO_MODE ? UNAVAILABLE_WIDGET : WIDGET_COMPONENTS[instance.type]

            return (
              <div key={instance.id} className={SPAN[instance.size]}>
                <WidgetFrame
                  instance={instance}
                  editing={editing}
                  first={index === 0}
                  last={index === widgets.length - 1}
                  portfolios={portfolios}
                  onMove={delta => move(index, delta)}
                  onRemove={() => remove(instance.id)}
                  onSize={(size: WidgetSize) => patch(instance.id, { size })}
                  onParams={(params: WidgetParams) => patch(instance.id, { params })}
                >
                  <Widget instance={instance} title={titleOf(instance)} />
                </WidgetFrame>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
