'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSetAssetVerdict } from '@/hooks/use-assets'
import type { HeldAsset } from '@/hooks/use-held-assets'
import type { IdentityVerdict } from '@/lib/api/backend-types'
import { isFlagged, isHumanVerdict } from '@/lib/assets/catalogue'
import { useAuth } from '@/lib/auth/auth-context'
import { AssetCell, ExternalAssetLink, FilterPills } from './asset-cell'
import { ContractLink } from './contract-link'
import { contractRef } from '@/lib/assets/links'

type Filter = 'awaiting' | 'decided'

// Suspect first: it is the weakest judgement and the likeliest false positive,
// so it is where a review most often puts real money back into the total.
const VERDICT_ORDER: Partial<Record<IdentityVerdict, number>> = {
  suspect: 0,
  impersonation: 1,
  scam: 2,
}

function byReviewOrder(a: HeldAsset, b: HeldAsset): number {
  const va = VERDICT_ORDER[a.asset!.identityVerdict!] ?? 9
  const vb = VERDICT_ORDER[b.asset!.identityVerdict!] ?? 9
  return (
    va - vb ||
    (a.asset!.identityScore ?? 0) - (b.asset!.identityScore ?? 0) ||
    a.symbol.localeCompare(b.symbol)
  )
}

/** The signals that fired, strongest first, printed as the scorer names them. */
function Signals({ signals }: { signals?: Record<string, number> }) {
  const entries = Object.entries(signals ?? {}).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([name, weight]) => (
        <span
          key={name}
          className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
        >
          {name} {weight.toFixed(1)}
        </span>
      ))}
    </div>
  )
}

/**
 * Flagged assets the reader actually holds — the part of the quarantine that
 * touches their total. The catalogue flags thousands of airdropped tokens nobody
 * here owns; listing those first is what made the old page unusable.
 */
export function ReviewTab({ rows }: { rows: HeldAsset[] }) {
  const { isAdmin } = useAuth()
  const setVerdict = useSetAssetVerdict()
  const [filter, setFilter] = useState<Filter>('awaiting')

  const flagged = rows.filter((r) => isFlagged(r.asset))
  const awaiting = flagged.filter((r) => !isHumanVerdict(r.asset?.verdictSource))
  const decided = flagged.filter((r) => isHumanVerdict(r.asset?.verdictSource))
  const visible = (filter === 'awaiting' ? awaiting : decided).sort(byReviewOrder)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Flagged by scam scoring and kept out of your totals until reviewed. A decision here is
          terminal — the scorer will not overwrite it.
          {!isAdmin && ' Verdicts are set by an admin.'}
        </p>
        <FilterPills
          label="Review state"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'awaiting', label: 'Awaiting', count: awaiting.length },
            { value: 'decided', label: 'Decided', count: decided.length },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === 'awaiting'
              ? 'Nothing you hold is waiting for review.'
              : 'No decisions yet on assets you hold.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table className="min-w-[44rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Why</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Held in</TableHead>
                <TableHead className="text-right">{isAdmin ? 'Decide' : ''}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
                const asset = row.asset!
                const verdict = asset.identityVerdict
                return (
                  <TableRow key={row.assetId} className="relative cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <AssetCell
                          assetId={row.assetId}
                          asset={asset}
                          symbol={row.symbol}
                          name={row.name}
                        />
                        <ExternalAssetLink asset={asset} />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[20rem]">
                      <Signals signals={asset.identitySignals} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-sm text-muted-foreground">
                      <span className="relative z-10">
                        <ContractLink contract={contractRef(asset)} />
                      </span>
                    </TableCell>
                    <TableCell className="text-sm max-w-[16ch] truncate" title={row.accounts.map((a) => a.name).join(', ')}>
                      {row.accounts.map((a) => a.name).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="relative z-10 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={setVerdict.isPending || verdict === 'legit'}
                            onClick={() => setVerdict.mutate({ id: asset.id, verdict: 'legit' })}
                          >
                            Not a scam
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={
                              setVerdict.isPending || (verdict === 'scam' && isHumanVerdict(asset.verdictSource))
                            }
                            onClick={() => setVerdict.mutate({ id: asset.id, verdict: 'scam' })}
                          >
                            Confirm scam
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        The catalogue flags far more assets than you hold, most of them airdrops nobody here
        holds —{' '}
        <Link href="/assets?tab=catalog&verdict=flagged" className="underline underline-offset-2 hover:text-primary">
          browse them in the catalogue
        </Link>
        .
      </p>
    </div>
  )
}
