'use client'

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
import type { Asset } from '@/lib/api/backend-types'
import { VerdictBadge } from './verdict-badge'

const FLAGGED = new Set(['scam', 'impersonation', 'suspect'])

function contractAddress(asset: Asset): string | undefined {
  return asset.tags
    ?.find((t) => t.startsWith('contract:'))
    ?.slice('contract:'.length)
}

// QuarantineSection surfaces the assets the scorer flagged for review. A verdict
// set here is a human decision and terminal — the scorer never overwrites it.
// Flagged holdings are already kept out of the portfolio total; this is where a
// false positive is reprieved or a scam is confirmed.
export function QuarantineSection({ assets }: { assets: Asset[] }) {
  const setVerdict = useSetAssetVerdict()

  const flagged = assets.filter((a) => a.identityVerdict && FLAGGED.has(a.identityVerdict))
  if (flagged.length === 0) return null

  return (
    <section className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div>
        <h3 className="text-lg font-semibold">Quarantine</h3>
        <p className="text-muted-foreground text-sm">
          {flagged.length} asset{flagged.length === 1 ? '' : 's'} flagged by scam
          scoring — excluded from portfolio totals until reviewed. Confirming or
          clearing is a human decision the scorer will not overwrite.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Verdict</TableHead>
            <TableHead>Contract</TableHead>
            <TableHead className="text-right">Review</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flagged.map((a) => {
            const contract = contractAddress(a)
            return (
              <TableRow key={a.id} title={a.id}>
                <TableCell className="font-medium">{a.symbol ?? '—'}</TableCell>
                <TableCell className="max-w-xs truncate" title={a.name}>
                  {a.name}
                </TableCell>
                <TableCell>
                  <VerdictBadge verdict={a.identityVerdict} source={a.verdictSource} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">
                  {contract ? (
                    <a
                      href={`https://etherscan.io/token/${contract}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      {contract.slice(0, 6)}…{contract.slice(-4)}
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={setVerdict.isPending}
                      onClick={() => setVerdict.mutate({ id: a.id, verdict: 'legit' })}
                    >
                      Not a scam
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={setVerdict.isPending}
                      onClick={() => setVerdict.mutate({ id: a.id, verdict: 'scam' })}
                    >
                      Confirm scam
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}
