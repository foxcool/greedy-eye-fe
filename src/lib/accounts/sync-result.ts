import type { SyncAccountResponse } from '@/lib/api/portfolio-api'

export interface SyncOutcome {
  partial: boolean
  errors: string[]
  positionsSkipped: number
  holdingsZeroed: number
}

// SyncAccount answers 200 even when part of the account could not be read, and
// protojson omits zero-valued fields, so a missing errors / counter means
// "none". Skipped positions count as partial even with no error text: the
// account's holdings are then incomplete.
export function summarizeSync(res: Partial<SyncAccountResponse> | null | undefined): SyncOutcome {
  const errors = res?.errors ?? []
  const positionsSkipped = res?.positionsSkipped ?? 0
  const holdingsZeroed = res?.holdingsZeroed ?? 0
  return {
    partial: errors.length > 0 || positionsSkipped > 0,
    errors,
    positionsSkipped,
    holdingsZeroed,
  }
}

const MAX_SHOWN = 5

export function describeSync(o: SyncOutcome): { title: string; detail: string } {
  const problems = Math.max(o.errors.length, o.positionsSkipped > 0 ? 1 : 0)
  const parts: string[] = []
  if (o.positionsSkipped > 0) parts.push(`${o.positionsSkipped} position(s) skipped`)
  if (o.holdingsZeroed > 0) parts.push(`${o.holdingsZeroed} holding(s) zeroed`)
  const lines = o.errors.slice(0, MAX_SHOWN)
  if (o.errors.length > MAX_SHOWN) lines.push(`…and ${o.errors.length - MAX_SHOWN} more`)
  return {
    title: `Sync finished with ${o.errors.length > 0 ? o.errors.length : problems} problem(s)`,
    detail: [...(parts.length ? [parts.join(', ')] : []), ...lines].join('\n'),
  }
}
