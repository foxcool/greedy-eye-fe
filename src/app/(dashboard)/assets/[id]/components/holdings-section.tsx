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
import { useAccounts } from '@/hooks/use-accounts'
import { useHoldingsQuery, useUpdateHolding } from '@/hooks/use-holdings'
import { useLatestPrice, usePricingStatus } from '@/hooks/use-assets'
import { usePortfolio } from '@/hooks/use-portfolio'
import { holdingToDecimal, type Asset } from '@/lib/api/backend-types'
import { truncateAddress } from '@/lib/assets/links'
import {
  holdingStatus,
  pricingLookup,
  statusExplanation,
  statusLabel,
} from '@/lib/assets/valuation-status'
import { formatCurrency, formatQuantity } from '@/lib/mocks'
import { EmptyPanel, Section } from './section'

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  ACCOUNT_TYPE_WALLET: 'Wallet',
  ACCOUNT_TYPE_EXCHANGE: 'Exchange',
  ACCOUNT_TYPE_MANUAL: 'Manual',
  ACCOUNT_TYPE_BROKER: 'Broker',
}

export function HoldingsSection({ asset }: { asset: Asset }) {
  const { data: holdings = [], isLoading } = useHoldingsQuery({ assetId: asset.id })
  const { data: accounts = [] } = useAccounts()
  const { data: price } = useLatestPrice(asset.id)
  const { data: summary } = usePortfolio()
  // The coverage list stops at 50 unpriced holdings while counting them all, so
  // this page's asset is usually outside it. Asked per asset, the same evidence
  // is not capped.
  const { data: pricingStatuses, isSuccess: pricingResolved } = usePricingStatus([asset.id])
  const update = useUpdateHolding()

  const accountById = new Map(accounts.map((a) => [a.id, a]))
  const unitPrice = price ? holdingToDecimal(price.last, price.decimals) : undefined

  // A positive signal only: the heatmap behind this list caps nothing, unlike
  // the coverage disclosure list.
  const assetIsPriced =
    summary?.holdings.find((h) => h.assetId === asset.id)?.unpriced === false

  const pricing = pricingLookup(asset.id, pricingStatuses, pricingResolved)

  // One asset cannot honestly have two scales. When it does, one of these rows
  // was written by a different path and the quantities are not comparable.
  const scales = new Set(holdings.map((h) => h.decimals))

  // Deduplicated: three positions kept out of the total for the same reason are
  // one fact stated once. Repeating an identical sentence per row reads as three
  // separate problems and trains the eye to skip the paragraph.
  const explanations = [
    ...new Set(
      holdings.map((h) =>
        statusExplanation(holdingStatus(h, asset, summary?.coverage, assetIsPriced, pricing))
      )
    ),
  ]

  return (
    <Section
      title="Your positions"
      description="An asset is not owned by a wallet: it may sit in several accounts, or in none. These are the positions you hold in it."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading positions…</p>
      ) : holdings.length === 0 ? (
        <EmptyPanel>You hold none of this asset.</EmptyPanel>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Liquidity</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Value at last quote</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">In total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h) => {
                const account = accountById.get(h.accountId)
                const qty = holdingToDecimal(h.amount, h.decimals)
                const status = holdingStatus(h, asset, summary?.coverage, assetIsPriced, pricing)
                const counted = status.kind === 'counted'
                return (
                  <TableRow key={h.id} className={h.excluded ? 'opacity-40' : undefined}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {account?.name ?? `account ${truncateAddress(h.accountId)}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {account ? (ACCOUNT_TYPE_LABEL[account.type] ?? account.type) : 'unknown account'}
                          {account?.data?.address && ` · ${truncateAddress(account.data.address)}`}
                        </span>
                      </div>
                    </TableCell>
                    {/* Empty chain is a real value meaning "not chain-scoped".
                        It never means Ethereum. */}
                    <TableCell className="text-sm">
                      {h.chain || (
                        <span
                          className="text-muted-foreground"
                          title="exchange balance or manual entry — this position is not chain-scoped"
                        >
                          off-chain
                        </span>
                      )}
                    </TableCell>
                    {/* Nor is empty liquidity a synonym for liquid. Without this
                        column two rows differing only by staked/liquid look like
                        a duplicate and invite someone to "fix" it. */}
                    <TableCell className="text-sm">
                      {h.liquidity || (
                        <span
                          className="text-muted-foreground"
                          title="the source could not partition this balance — not a claim that it is spendable"
                        >
                          unpartitioned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(qty)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ·{h.decimals}d
                      </span>
                    </TableCell>
                    {/* Shown even when the row is out of the total. The reader
                        arrived holding this number and asking about it; hiding it
                        means the page cannot answer. The tag is the fix, not the
                        omission. */}
                    <TableCell
                      className={`text-right tabular-nums ${counted ? '' : 'text-muted-foreground'}`}
                    >
                      {unitPrice === undefined ? '—' : formatCurrency(qty * unitPrice, 2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {statusLabel(status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: h.id, excluded: !h.excluded })}
                      >
                        {h.excluded ? 'Include' : 'Exclude'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {scales.size > 1 && (
            <p className="text-sm text-destructive">
              Two different scales are recorded for this asset ({[...scales].join(', ')}{' '}
              decimals). One of these rows was written by a different path, and the quantities
              are not comparable until that is reconciled.
            </p>
          )}

          <div className="space-y-1">
            {explanations.map((text) => (
              <p key={text} className="text-sm text-muted-foreground">
                {text}
              </p>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Chain and liquidity describe the position. A blank chain means the position is not
            chain-scoped, not that it is on Ethereum.
          </p>
        </>
      )}
    </Section>
  )
}
