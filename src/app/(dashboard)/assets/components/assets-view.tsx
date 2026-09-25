'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCreateAsset } from '@/hooks/use-assets'
import { useHeldAssets } from '@/hooks/use-held-assets'
import { assetCardHref } from '@/lib/assets/links'
import { isFlagged, isHumanVerdict } from '@/lib/assets/catalogue'
import { DEMO_MODE } from '@/lib/config/data-source'
import { formatCurrency } from '@/lib/mocks'
import { AssetForm } from './asset-form'
import { CatalogTab, isVerdictFilter, type VerdictFilter } from './catalog-tab'
import { MineTab } from './mine-tab'
import { ReviewTab } from './review-tab'

const TABS = ['mine', 'review', 'catalog'] as const
type Tab = (typeof TABS)[number]

function isTab(v: string | null): v is Tab {
  return TABS.includes(v as Tab)
}

/**
 * /assets as three questions instead of one table.
 *
 * Mine — what do I hold and what is it worth. Review — which of my positions did
 * the scorer pull out of the total, and was it right. Catalog — find any asset
 * by name or contract. The old page answered only the third, and led with 1495
 * quarantine rows of which a few hundred touched the reader's money.
 *
 * The tab and the catalogue's verdict filter live in the URL, so returning from
 * an asset card lands on the same view, and a link can point at "flagged".
 */
export function AssetsView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tabParam = params.get('tab')
  const tab: Tab = isTab(tabParam) ? tabParam : 'mine'
  const verdictParam = params.get('verdict')
  const verdict: VerdictFilter = isVerdictFilter(verdictParam) ? verdictParam : 'any'

  const setParams = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined) sp.delete(k)
      else sp.set(k, v)
    }
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const { data: held, assets, totalValue, isLoading, isValuing, error } = useHeldAssets()
  const create = useCreateAsset()
  const [createOpen, setCreateOpen] = useState(false)

  const heldIds = useMemo(() => new Set((held ?? []).map((r) => r.assetId)), [held])
  const counts = useMemo(() => {
    const rows = held ?? []
    return {
      mine: rows.length,
      review: rows.filter((r) => isFlagged(r.asset) && !isHumanVerdict(r.asset?.verdictSource)).length,
      catalog: assets?.length ?? 0,
      catalogueFlagged: (assets ?? []).filter((a) => isFlagged(a)).length,
      unpriced: rows.filter((r) => r.state !== 'excluded' && r.unpriced).length,
    }
  }, [held, assets])

  if (DEMO_MODE) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Assets</h2>
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">Assets need a backend; the demo has no catalogue.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Assets</h2>
          {held && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {counts.mine} held
              {totalValue !== undefined && <> · {formatCurrency(totalValue)} in total</>}
              {counts.unpriced > 0 && <> · {counts.unpriced} unpriced</>}
              {counts.review > 0 && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-primary"
                    onClick={() => setParams({ tab: 'review' })}
                  >
                    {counts.review} to review
                  </button>
                </>
              )}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => setCreateOpen(true)}>
          Add asset
        </Button>
      </div>

      {error ? (
        <p className="text-destructive">Failed to load assets.</p>
      ) : isLoading || !held || !assets ? (
        <div className="space-y-2">
          <div className="h-9 w-72 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v === 'mine' ? undefined : v })}>
          <TabsList>
            <TabsTrigger value="mine">
              Mine <span className="ml-1.5 tabular-nums opacity-60">{counts.mine}</span>
            </TabsTrigger>
            <TabsTrigger value="review">
              Review
              {counts.review > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-xs tabular-nums text-amber-700 dark:text-amber-400">
                  {counts.review}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="catalog">
              Catalog{' '}
              <span className="ml-1.5 tabular-nums opacity-60">
                {counts.catalog.toLocaleString('en-US')}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="mt-4">
            <MineTab rows={held} isValuing={isValuing} />
          </TabsContent>
          <TabsContent value="review" className="mt-4">
            <ReviewTab rows={held} catalogueFlagged={counts.catalogueFlagged} />
          </TabsContent>
          <TabsContent value="catalog" className="mt-4">
            <CatalogTab
              assets={assets}
              heldIds={heldIds}
              verdict={verdict}
              onVerdictChange={(v) => setParams({ verdict: v === 'any' ? undefined : v })}
            />
          </TabsContent>
        </Tabs>
      )}

      <AssetForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        isLoading={create.isPending}
        onSubmit={(values) =>
          create.mutate(values, {
            // A new entry is created to be looked at or bound — open its card.
            onSuccess: (asset) => {
              setCreateOpen(false)
              const href = assetCardHref(asset?.id)
              if (href) router.push(href)
            },
          })
        }
      />
    </div>
  )
}
