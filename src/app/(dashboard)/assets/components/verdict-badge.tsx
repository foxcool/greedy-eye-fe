import type { IdentityVerdict } from '@/lib/api/backend-types'

// Presentation for each scam-filtering verdict. "legit" and "unknown" are the
// quiet default and render nothing — only a judgement worth the user's eye gets
// a badge.
const STYLES: Record<
  IdentityVerdict,
  { label: string; className: string } | null
> = {
  unknown: null,
  legit: null,
  suspect: {
    label: 'Suspect',
    className:
      'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 ring-yellow-500/30',
  },
  impersonation: {
    label: 'Impersonation',
    className:
      'bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-orange-500/30',
  },
  scam: {
    label: 'Scam',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400 ring-red-500/30',
  },
}

export function VerdictBadge({
  verdict,
  source,
}: {
  verdict?: IdentityVerdict
  source?: string
}) {
  const style = verdict ? STYLES[verdict] : null
  if (!style) return null
  // A user verdict is a human decision; mark it so the machine ones read as
  // provisional.
  const byUser = source?.startsWith('user:')
  return (
    <span
      title={source ? `verdict source: ${source}` : undefined}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}
    >
      {style.label}
      {byUser && <span aria-label="set by a person">✓</span>}
    </span>
  )
}
