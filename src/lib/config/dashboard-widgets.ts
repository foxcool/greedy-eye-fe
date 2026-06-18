/**
 * Dashboard widget configuration.
 *
 * Declares which macro widgets render and in what order. v1 is a static default;
 * a future iteration adds per-user toggles/reordering (tracked in issue tracker)
 * persisted to localStorage — `MacroDashboard` already reads from this list so
 * only the source of the list needs to change.
 */
export type WidgetId = 'interest-rates' | 'markets' | 'crypto-overview' | 'news'

export interface WidgetConfig {
  id: WidgetId
  enabled: boolean
  order: number
}

export const defaultWidgets: WidgetConfig[] = [
  { id: 'interest-rates', enabled: true, order: 0 },
  { id: 'markets', enabled: true, order: 1 },
  { id: 'crypto-overview', enabled: true, order: 2 },
  { id: 'news', enabled: true, order: 3 },
]

export function enabledWidgets(config: WidgetConfig[] = defaultWidgets): WidgetId[] {
  return config
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order)
    .map((w) => w.id)
}
