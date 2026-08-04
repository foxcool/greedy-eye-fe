/**
 * Dashboard widget registry: what a widget is, not how it renders.
 *
 * The dashboard is a list of widget INSTANCES, not of widget types. One type
 * may appear several times with different parameters — the heatmap for one
 * portfolio beside the heatmap for everything — so an instance carries its own
 * id and params.
 *
 * Components live in components/dashboard/widget-registry.tsx. This module is
 * imported by hooks and config paths that have no business pulling React in.
 */

import { z } from 'zod'

export type WidgetId =
  | 'portfolio-value'
  | 'heatmap'
  | 'interest-rates'
  | 'markets'
  | 'crypto-overview'
  | 'news'

/** Grid presets. Free resizing needs drag handles; these need one click. */
export type WidgetSize = 's' | 'm' | 'l'

/**
 * Widget parameters are a flat map of strings.
 *
 * Every parameter v1 has is an enum member or an id, and a flat shape keeps the
 * edit form a loop over fields instead of a schema interpreter. A widget that
 * genuinely needs structure gets its own encoding inside one value rather than
 * this type growing to fit it.
 */
export type WidgetParams = Record<string, string>

export interface WidgetInstance {
  /** Client-generated; identifies the instance across reorders and edits. */
  id: string
  type: WidgetId
  params: WidgetParams
  order: number
  size: WidgetSize
}

export interface DashboardConfig {
  version: 1
  widgets: WidgetInstance[]
}

/** A parameter the user can set from the edit form. */
export type ParamField =
  | {
      key: string
      label: string
      kind: 'select'
      options: { value: string; label: string }[]
    }
  | {
      key: string
      label: string
      /** A select over the caller's portfolios, filled in at render time. */
      kind: 'portfolio'
      /** Label for the "no particular portfolio" option. */
      allLabel: string
    }

export interface WidgetDefinition {
  type: WidgetId
  title: string
  description: string
  defaultParams: WidgetParams
  defaultSize: WidgetSize
  fields: ParamField[]
  /**
   * True for widgets with no data source behind them. They stay available in
   * the demo, where everything is openly fake, and are neither offered nor
   * rendered against a real backend: a mocked interest rate beside a real
   * portfolio total is indistinguishable from a real one.
   */
  demoOnly?: boolean
}

const PORTFOLIO_FIELD: ParamField = {
  key: 'portfolioId',
  label: 'Portfolio',
  kind: 'portfolio',
  allLabel: 'All portfolios',
}

export const WIDGET_DEFINITIONS: Record<WidgetId, WidgetDefinition> = {
  'portfolio-value': {
    type: 'portfolio-value',
    title: 'Portfolio value',
    description: 'Total value and 24h change, for one portfolio or all of them.',
    defaultParams: { portfolioId: '' },
    defaultSize: 'm',
    fields: [PORTFOLIO_FIELD],
  },
  heatmap: {
    type: 'heatmap',
    title: 'Heatmap',
    description: 'Holdings as a treemap: tile size is value, colour is price change.',
    defaultParams: { scope: 'balance', portfolioId: '' },
    defaultSize: 'l',
    fields: [
      {
        key: 'scope',
        label: 'Scope',
        kind: 'select',
        // MARKET and BASKET are backend scopes that answer Unimplemented. They
        // are absent here rather than disabled: an option that always fails is
        // a promise the system does not keep.
        options: [
          { value: 'balance', label: 'All holdings' },
          { value: 'portfolio', label: 'One portfolio' },
        ],
      },
      PORTFOLIO_FIELD,
    ],
  },
  'interest-rates': {
    type: 'interest-rates',
    title: 'Interest rates',
    description: 'Central bank rates and next meeting dates.',
    defaultParams: {},
    defaultSize: 'm',
    fields: [],
    demoOnly: true,
  },
  markets: {
    type: 'markets',
    title: 'Markets',
    description: 'Index levels and daily moves.',
    defaultParams: {},
    defaultSize: 'm',
    fields: [],
    demoOnly: true,
  },
  'crypto-overview': {
    type: 'crypto-overview',
    title: 'Crypto overview',
    description: 'Market capitalisation and dominance.',
    defaultParams: {},
    defaultSize: 'm',
    fields: [],
    demoOnly: true,
  },
  news: {
    type: 'news',
    title: 'News',
    description: 'Headlines from connected feeds.',
    defaultParams: {},
    defaultSize: 'm',
    fields: [],
    demoOnly: true,
  },
}

const WIDGET_IDS = Object.keys(WIDGET_DEFINITIONS) as WidgetId[]

/** The setting key this config is stored under; the version is part of it. */
export const DASHBOARD_SETTING_KEY = 'dashboard.v1'

const widgetInstanceSchema = z.object({
  id: z.string().min(1),
  type: z.enum(WIDGET_IDS as [WidgetId, ...WidgetId[]]),
  params: z.record(z.string(), z.string()).default({}),
  order: z.number().int(),
  size: z.enum(['s', 'm', 'l']),
})

/** Fresh instance of a type, with its declared defaults. */
export function newInstance(type: WidgetId, order: number): WidgetInstance {
  const def = WIDGET_DEFINITIONS[type]
  return {
    id: crypto.randomUUID(),
    type,
    params: { ...def.defaultParams },
    order,
    size: def.defaultSize,
  }
}

/** What a user sees before they have arranged anything. */
export function defaultDashboardConfig(): DashboardConfig {
  return {
    version: 1,
    widgets: [newInstance('portfolio-value', 0), newInstance('heatmap', 1)],
  }
}

/**
 * Read a stored config, dropping what cannot be read.
 *
 * Per widget rather than per document on purpose: a layout containing one
 * widget this build no longer knows about degrades to the rest of the layout.
 * Failing the whole parse would throw away an arrangement built by hand
 * because of one unreadable row.
 *
 * Returns null when there is nothing usable at all, which the caller reads as
 * "never configured" — distinct from "configured to be empty".
 */
export function parseDashboardConfig(raw: unknown): DashboardConfig | null {
  if (raw === null || typeof raw !== 'object') return null

  const candidates = (raw as { widgets?: unknown }).widgets
  if (!Array.isArray(candidates)) return null

  const widgets: WidgetInstance[] = []
  for (const candidate of candidates) {
    const parsed = widgetInstanceSchema.safeParse(candidate)
    if (parsed.success) widgets.push(parsed.data)
  }
  if (widgets.length === 0 && candidates.length > 0) return null

  return { version: 1, widgets: sortWidgets(widgets) }
}

/** Order is the layout; ties break by id so a render never flickers. */
export function sortWidgets(widgets: WidgetInstance[]): WidgetInstance[] {
  return [...widgets].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

/**
 * Renumber order to 0..n-1 after a move or a removal, so a later insert cannot
 * collide with a gap left behind.
 */
export function renumber(widgets: WidgetInstance[]): WidgetInstance[] {
  return sortWidgets(widgets).map((w, i) => ({ ...w, order: i }))
}

/** Which types may be added in this mode. */
export function availableWidgets(demoMode: boolean): WidgetDefinition[] {
  return WIDGET_IDS.map(id => WIDGET_DEFINITIONS[id]).filter(d => demoMode || !d.demoOnly)
}
