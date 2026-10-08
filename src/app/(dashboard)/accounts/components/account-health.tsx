'use client'

import { useState } from 'react'
import type { AccountHealth, AccountHealthResponse, HealthReason, HealthState } from '@/lib/api/backend-types'

// The state is the server's verdict; this only decides how it looks. Healthy is
// the quiet default, so only a problem gets colour.
const STATE_STYLES: Partial<Record<HealthState, { label: string; className: string }>> = {
  HEALTH_STATE_DEGRADED: {
    label: 'Degraded',
    className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 ring-yellow-500/30',
  },
  HEALTH_STATE_UNUSABLE: {
    label: 'Unusable',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400 ring-red-500/30',
  },
  // A stood-down account is its owner's decision, not a fault: neutral, so it
  // does not teach anyone to look past the red ones.
  HEALTH_STATE_DISABLED: {
    label: 'Disabled',
    className: 'bg-muted text-muted-foreground ring-border',
  },
}

function ReasonList({ reasons }: { reasons: HealthReason[] }) {
  return (
    <ul className="mt-1 min-w-64 max-w-sm space-y-1 text-xs text-muted-foreground">
      {reasons.map((r, i) => (
        <li key={i}>
          {r.message}
          {r.until && <> — next try {new Date(r.until).toLocaleString()}</>}
          {r.kind === 'HEALTH_REASON_KIND_DISABLED' && r.since && <> — since {new Date(r.since).toLocaleString()}</>}
          {r.detail && <div className="font-mono break-words opacity-80">{r.detail}</div>}
        </li>
      ))}
    </ul>
  )
}

// HealthCell shows one account's state. Absent health — the RPC failed, or the
// account appeared after the last read — renders as a dash, never as OK.
export function HealthCell({ health }: { health?: AccountHealth }) {
  const [open, setOpen] = useState(false)
  if (!health) return <span className="text-muted-foreground">—</span>
  if (health.state === 'HEALTH_STATE_OK') return <span className="text-xs text-muted-foreground">OK</span>

  const style = STATE_STYLES[health.state]
  if (!style) return <span className="text-xs text-muted-foreground">Unknown</span>
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}
      >
        {style.label}
      </button>
      {open && <ReasonList reasons={health.reasons ?? []} />}
    </div>
  )
}

// HealthNotice sits above the list and says what the rows cannot: that health
// could not be read at all, that price sources cannot be judged here, or which
// price sources — shared ones included — are not working.
export function HealthNotice({ data, failed }: { data?: AccountHealthResponse; failed: boolean }) {
  if (failed) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Account health is unknown: the server did not answer.
      </p>
    )
  }
  if (!data) return null

  const state = data.sourcesState ?? 'HEALTH_STATE_UNKNOWN'
  if (state === 'HEALTH_STATE_UNKNOWN' || state === 'HEALTH_STATE_UNSPECIFIED') {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Price source health is unknown on this instance.
      </p>
    )
  }

  const unwell = (data.sources ?? []).filter((s) => s.state !== 'HEALTH_STATE_OK')
  if (unwell.length === 0) return null
  return (
    <div role="status" className="rounded-lg border border-border p-3 text-sm">
      {unwell.map((s) => (
        <div key={s.provider}>
          <span className="font-medium">Price source {s.provider}</span>:{' '}
          {STATE_STYLES[s.state]?.label.toLowerCase() ?? 'unknown'}
          <ReasonList reasons={s.reasons ?? []} />
        </div>
      ))}
    </div>
  )
}
