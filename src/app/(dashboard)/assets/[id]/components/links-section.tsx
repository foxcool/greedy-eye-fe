'use client'

import { CopyButton } from '@/components/ui/copy-button'
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
}: {
  label: string
  address: string
  href?: string
  origin?: string
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
      </div>
    </div>
  )
}

export function LinksSection({ asset }: { asset: Asset }) {
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
            />
          )}
        </div>
      )}
    </Section>
  )
}
