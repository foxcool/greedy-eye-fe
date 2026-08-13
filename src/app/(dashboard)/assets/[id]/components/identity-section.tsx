'use client'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/auth-context'
import { useSetAssetVerdict } from '@/hooks/use-assets'
import type { Asset, IdentityVerdict } from '@/lib/api/backend-types'
import { Facts, Row, Section } from './section'

const VERDICT_WORDS: Record<IdentityVerdict, string> = {
  unknown: 'Unknown',
  legit: 'Legit',
  suspect: 'Suspect',
  scam: 'Scam',
  impersonation: 'Impersonation',
}

// The four a person can set. "unknown" is the scorer's starting state, not a
// decision, so it is not offered as one.
const SETTABLE: Exclude<IdentityVerdict, 'unknown'>[] = [
  'legit',
  'suspect',
  'scam',
  'impersonation',
]

export function IdentitySection({ asset }: { asset: Asset }) {
  const { isAdmin } = useAuth()
  const setVerdict = useSetAssetVerdict()

  const verdict = asset.identityVerdict ?? 'unknown'
  const signals = Object.entries(asset.identitySignals ?? {}).sort((a, b) => b[1] - a[1])

  return (
    <Section
      title="Identity"
      description="Whether this asset is what it claims to be. A human verdict is terminal — the scorer will not overwrite it."
    >
      <Facts>
        {/* The word, not just the badge: VerdictBadge renders nothing for
            "unknown" and "legit", which is right in a table and wrong on the page
            whose subject is the verdict. */}
        <Row label="Verdict">{VERDICT_WORDS[verdict]}</Row>
        <Row label="Set by" muted>
          {asset.verdictSource ?? '—'}
          {asset.verdictSource?.startsWith('user:') && (
            <span className="ml-1" aria-label="set by a person">
              ✓
            </span>
          )}
        </Row>
        {/* proto3 omits a zero, so an absent score and a genuine 0.0 arrive
            identically. Printing "0.00" would assert a measurement that may
            never have been taken. */}
        <Row label="Score" muted>
          {asset.identityScore === undefined ? 'not scored' : asset.identityScore.toFixed(2)}
        </Row>
        <Row label="Verdict set" muted>
          {asset.verdictSetAt ? new Date(asset.verdictSetAt).toLocaleString() : '—'}
        </Row>
      </Facts>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Signals
        </p>
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No signals recorded — the verdict was not reached by the scorer, or nothing fired.
          </p>
        ) : (
          <dl className="rounded-lg border border-border divide-y divide-border">
            {signals.map(([name, weight]) => (
              <div key={name} className="flex justify-between gap-4 px-4 py-2">
                {/* Signal names are printed exactly as the scorer emits them. A
                    label map would silently degrade to "undefined" the first time
                    the backend adds a key. */}
                <dt className="text-xs font-mono text-muted-foreground">{name}</dt>
                <dd className="text-xs font-mono tabular-nums text-foreground">
                  {weight.toFixed(2)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {/* No total: this page does not reproduce the scoring model, and a sum
            printed here would be read as the score. */}
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          {SETTABLE.map((v) => (
            <Button
              key={v}
              variant={v === 'legit' ? 'outline' : 'destructive'}
              size="sm"
              disabled={setVerdict.isPending || verdict === v}
              onClick={() => setVerdict.mutate({ id: asset.id, verdict: v })}
            >
              {VERDICT_WORDS[v]}
            </Button>
          ))}
        </div>
      )}
    </Section>
  )
}
