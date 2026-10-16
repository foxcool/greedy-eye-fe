'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { useDeleteAssetExternalRef } from '@/hooks/use-assets'
import { useAuth } from '@/lib/auth/auth-context'
import {
  coingeckoRef,
  coingeckoUrl,
  contractRef,
  contractUrl,
  explorerUrl,
  truncateAddress,
} from '@/lib/assets/links'
import type { Asset, AssetExternalRef } from '@/lib/api/backend-types'
import { EmptyPanel, Section } from './section'

const ONCHAIN = 'onchain:'

function RefRow({
  label,
  address,
  href,
  origin,
  action,
}: {
  label: string
  address: string
  href?: string
  origin?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {origin && <p className="text-xs text-muted-foreground">{origin}</p>}
      </div>
      <div className="flex items-center gap-2">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm hover:text-primary"
            title={address}
          >
            {truncateAddress(address)}
          </a>
        ) : (
          // No link beats a link into the wrong network. The address is still
          // readable and copyable.
          <span className="font-mono text-sm text-muted-foreground" title={address}>
            {truncateAddress(address)}
          </span>
        )}
        <CopyButton value={address} label="Copy" />
        {action}
      </div>
    </div>
  )
}

/**
 * Detaching a binding, for the one case where the binding was the error: a
 * contract bound to a ticker it does not belong to routes every sync to this
 * asset and lends it this asset's price.
 *
 * Nothing moves on click. The next sync of an account holding that contract
 * resolves it on its own merits — an unrecognised contract lands on its own
 * isolated asset, out of the total until something prices it — and the stale
 * row here is zeroed as absent from the snapshot. Moving holdings from the UI
 * would mean deciding what the balance is, the same judgement that went wrong.
 */
function UnbindAction({
  assetId,
  refId,
  confirming,
  onConfirming,
}: {
  assetId: string
  refId: string
  confirming: boolean
  onConfirming: (on: boolean) => void
}) {
  const unbind = useDeleteAssetExternalRef()
  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => onConfirming(true)}>
        Unbind
      </Button>
    )
  }
  return (
    <div className="flex gap-2">
      <Button
        variant="destructive"
        size="sm"
        disabled={unbind.isPending}
        onClick={() =>
          unbind.mutate({ assetId, id: refId }, { onSuccess: () => onConfirming(false) })
        }
      >
        Confirm
      </Button>
      <Button variant="outline" size="sm" onClick={() => onConfirming(false)}>
        Cancel
      </Button>
    </div>
  )
}

export function LinksSection({ asset }: { asset: Asset }) {
  // Admin-only on the backend, like the verdict: a binding is catalogue
  // identity, shared by every user. Not rendered for anyone else.
  const { isAdmin } = useAuth()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const unbindAction = (refId: string) =>
    isAdmin ? (
      <UnbindAction
        assetId={asset.id}
        refId={refId}
        confirming={confirmId === refId}
        onConfirming={(on) => setConfirmId(on ? refId : null)}
      />
    ) : undefined

  const onchain: AssetExternalRef[] = (asset.externalRefs ?? []).filter((r) =>
    r.source.startsWith(ONCHAIN)
  )
  const gecko = coingeckoRef(asset)
  // Only reached when GetAsset returned no on-chain refs: the contract: tag has
  // no chain in it, so explorerUrl answers with the multi-chain search rather
  // than guessing a network.
  const tagged = onchain.length === 0 ? contractRef(asset) : undefined

  const hasAnything = onchain.length > 0 || gecko || tagged

  return (
    <Section
      title="Links"
      description="Where this asset can be looked up outside this system. On a chain, identity is the contract — not the ticker."
    >
      {!hasAnything ? (
        <EmptyPanel>
          No external identifiers recorded. Nothing binds this asset to a chain or a data
          provider.
        </EmptyPanel>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {onchain.map((ref) => {
            const chain = ref.source.slice(ONCHAIN.length)
            return (
              <RefRow
                key={ref.id}
                label={chain}
                address={ref.ref}
                href={explorerUrl(chain, ref.ref)}
                origin={ref.origin}
                action={unbindAction(ref.id)}
              />
            )
          })}
          {tagged && (
            <RefRow
              label="contract (chain not recorded)"
              address={tagged.address}
              href={contractUrl(tagged)}
              origin="from tag — searches every explorer"
            />
          )}
          {gecko && (
            <RefRow
              label="CoinGecko"
              address={gecko.ref}
              href={coingeckoUrl(gecko.ref)}
              origin={gecko.origin}
              action={unbindAction(gecko.id)}
            />
          )}
        </div>
      )}
      {isAdmin && onchain.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Unbinding a contract does not move any balance. The next sync of an account holding it
          resolves the contract again on its own merits; a contract no venue lists under this
          ticker gets its own asset and stays out of the total until something prices it.
        </p>
      )}
    </Section>
  )
}
