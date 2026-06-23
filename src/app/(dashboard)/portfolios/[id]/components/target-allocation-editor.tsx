'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useHoldings } from '@/hooks/use-portfolio'
import { useAssets } from '@/hooks/use-assets'
import { useTargetAllocationRule, useSaveTargetAllocation, useDeleteRule } from '@/hooks/use-rules'
import type { TargetsMap } from '@/lib/api/automation-api'

// Quote currency the unallocated remainder is held in. Hardcoded until portfolios
// expose a configurable quote asset.
const QUOTE_TICKER = 'USD'

// Holdings below this share of the portfolio are dust — kept out of the auto-built
// row list (still addable manually) to avoid bloat.
const SIGNIFICANT_PCT = 1

// Rounds float percentages to integers whose sum equals round(total), capped at
// `cap`, using the largest-remainder method so per-row rounding never overshoots
// (e.g. 38.5+25.3+… would otherwise sum to 101 after independent rounding).
function roundPercentages(
  entries: { id: string; value: number }[],
  cap = 100
): Record<string, string> {
  const floors = entries.map((e) => ({ id: e.id, floor: Math.floor(e.value), frac: e.value - Math.floor(e.value) }))
  const sumFloor = floors.reduce((s, e) => s + e.floor, 0)
  const rawTotal = entries.reduce((s, e) => s + e.value, 0)
  const target = Math.min(Math.round(rawTotal), cap)
  let remainder = Math.max(0, target - sumFloor)
  const byFrac = [...floors].sort((a, b) => b.frac - a.frac)
  const bump = new Set<string>()
  for (const e of byFrac) {
    if (remainder <= 0) break
    bump.add(e.id)
    remainder--
  }
  const out: Record<string, string> = {}
  for (const e of floors) out[e.id] = String(e.floor + (bump.has(e.id) ? 1 : 0))
  return out
}

// Editor for per-asset target percentages. Sum may be ≤100; the remainder is held
// in the quote currency. Saving is blocked when the sum exceeds 100.
export function TargetAllocationEditor({ portfolioId }: { portfolioId: string }) {
  const { rule, isLoading: ruleLoading } = useTargetAllocationRule(portfolioId)
  const { data: holdings } = useHoldings('value', 'desc')
  const { data: assets = [] } = useAssets()
  const save = useSaveTargetAllocation(portfolioId)
  const remove = useDeleteRule()

  // assetId → symbol, for labelling rows (holdings first, then asset registry).
  const symbolOf = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of assets) map.set(a.id, a.symbol?.toUpperCase() ?? a.name)
    for (const h of holdings ?? []) map.set(h.assetId, h.symbol.toUpperCase())
    return map
  }, [assets, holdings])

  // assetId → current share of the portfolio (raw float %), straight from holdings.
  const currentPctByAsset = useMemo(() => {
    const map = new Map<string, number>()
    for (const h of holdings ?? []) map.set(h.assetId, h.percentage)
    return map
  }, [holdings])

  // Local editable state: assetId → percentage string. Initialized once from the
  // saved targets plus the portfolio's *significant* holdings (dust excluded).
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const initial = useMemo(() => {
    const out: Record<string, string> = {}
    for (const h of holdings ?? []) {
      if (h.percentage >= SIGNIFICANT_PCT) out[h.assetId] = '0'
    }
    const saved = (rule?.configuration?.['targets'] as Record<string, unknown>) ?? {}
    for (const [id, v] of Object.entries(saved)) out[id] = String(Number(v) || 0)
    return out
  }, [holdings, rule])

  const rows = draft ?? initial
  const setRow = (assetId: string, value: string) =>
    setDraft({ ...rows, [assetId]: value })

  const sum = Object.values(rows).reduce((s, v) => s + (Number(v) || 0), 0)
  const unallocated = 100 - sum
  const overAllocated = sum > 100
  const hasNegative = Object.values(rows).some((v) => Number(v) < 0)
  const canSave = !overAllocated && !hasNegative && !save.isPending

  // Assets available to add (not already a row).
  const addable = assets.filter((a) => !(a.id in rows))

  function addAsset(assetId: string) {
    if (!assetId) return
    setDraft({ ...rows, [assetId]: '0' })
  }

  // Snapshot current allocation into targets. Significant holdings plus any
  // existing rows are rounded together so the result sums to ≤100 (no overshoot).
  function fillFromCurrent() {
    const ids = new Set<string>(Object.keys(rows))
    for (const [assetId, pct] of currentPctByAsset) {
      if (pct >= SIGNIFICANT_PCT) ids.add(assetId)
    }
    const entries = [...ids].map((id) => ({ id, value: currentPctByAsset.get(id) ?? 0 }))
    setDraft(roundPercentages(entries, 100))
  }

  // Zero every row without removing them (lets the user disable targets via Save).
  function resetToZero() {
    const next: Record<string, string> = {}
    for (const assetId of Object.keys(rows)) next[assetId] = '0'
    setDraft(next)
  }

  function handleSave() {
    const targets: TargetsMap = {}
    for (const [assetId, v] of Object.entries(rows)) {
      const n = Number(v)
      if (Number.isFinite(n) && n > 0) targets[assetId] = n
    }
    // Keep the draft as-is: it already equals the saved values, so the editor
    // stays stable instead of recomputing (and flickering) during the refetch.
    save.mutate({ targets, existing: rule })
  }

  function handleClear() {
    if (rule?.id) remove.mutate(rule.id, { onSuccess: () => setDraft(null) })
  }

  // Stable display order: by current portfolio share (desc), then symbol. Uses
  // current share — not the typed target — so rows don't jump while editing.
  const rowIds = useMemo(
    () =>
      Object.keys(rows).sort((a, b) => {
        const ca = currentPctByAsset.get(a) ?? 0
        const cb = currentPctByAsset.get(b) ?? 0
        if (cb !== ca) return cb - ca
        return (symbolOf.get(a) ?? a).localeCompare(symbolOf.get(b) ?? b)
      }),
    [rows, currentPctByAsset, symbolOf]
  )

  if (ruleLoading) {
    return <p className="text-sm text-muted-foreground">Loading targets…</p>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rowIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add assets to define target proportions.
          </p>
        ) : (
          rowIds.map((assetId) => (
            <div key={assetId} className="flex items-center gap-3">
              <span className="w-32 text-sm font-medium text-foreground truncate">
                {symbolOf.get(assetId) ?? assetId}
              </span>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={rows[assetId]}
                onChange={(e) => setRow(assetId, e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))
        )}
      </div>

      {addable.length > 0 && (
        <select
          value=""
          onChange={(e) => addAsset(e.target.value)}
          className="flex h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">+ Add asset…</option>
          {addable.map((a) => (
            <option key={a.id} value={a.id}>
              {a.symbol?.toUpperCase() ?? a.name}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className={overAllocated ? 'text-destructive' : 'text-muted-foreground'}>
          Allocated: {sum}% {overAllocated && '(exceeds 100%)'}
        </span>
        <span className="text-muted-foreground">
          {QUOTE_TICKER}: {unallocated >= 0 ? unallocated : 0}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={!canSave}>
          {save.isPending ? 'Saving…' : 'Save targets'}
        </Button>
        <Button size="sm" variant="outline" onClick={fillFromCurrent}>
          Set current as target
        </Button>
        <Button size="sm" variant="outline" onClick={resetToZero}>
          Reset to zero
        </Button>
        {rule?.id && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={handleClear}
            disabled={remove.isPending}
          >
            {remove.isPending ? 'Clearing…' : 'Clear targets'}
          </Button>
        )}
      </div>
    </div>
  )
}
