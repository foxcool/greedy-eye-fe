import type { Asset, AssetExternalRef } from '@/lib/api/backend-types'

/**
 * Where an asset's identity can be looked up outside this system, and how to
 * print an address short enough for a table cell.
 *
 * All of it lived inline in three components before, which is how a Polygon
 * contract came to be linked to etherscan.io: the chain was never part of the
 * decision, so every address was silently treated as Ethereum.
 */

/** Prefix of the pricing-hint tag the backend mirrors an on-chain ref into. */
const CONTRACT_TAG = 'contract:'

/** Prefix of an external-ref source that names a chain. */
const ONCHAIN_SOURCE = 'onchain:'

/**
 * A contract address together with the chain it lives on — or without one, when
 * the only thing available is the `contract:` tag.
 *
 * The absence is real and must survive: the backend mirrors an on-chain ref into
 * `contract:<address>` as a pricing hint and drops the chain doing so
 * (`marketdata/handler.go`), so a caller holding only tags cannot know where the
 * token is. Guessing is what produced the bug this module exists to fix.
 */
export interface ContractRef {
  address: string
  /** Internal chain id ("eth", "base", "polygon"); absent when unknown. */
  chain?: string
}

/**
 * The asset's on-chain identity, preferring the external ref that names its
 * chain and falling back to the chainless tag.
 *
 * Note that `externalRefs` is populated by GetAsset alone — from ListAssets it
 * is always empty, and an empty list there means "not loaded", never "this asset
 * has none". So a list view legitimately gets a ref with no chain, and a detail
 * view gets the full one.
 */
export function contractRef(asset: Asset): ContractRef | undefined {
  const onchain = asset.externalRefs?.find((r) => r.source.startsWith(ONCHAIN_SOURCE))
  if (onchain) {
    return { address: onchain.ref, chain: onchain.source.slice(ONCHAIN_SOURCE.length) }
  }
  const tagged = asset.tags?.find((t) => t.startsWith(CONTRACT_TAG))
  if (tagged) return { address: tagged.slice(CONTRACT_TAG.length) }
  return undefined
}

/** The CoinGecko id among the asset's external refs, if one was ever bound. */
export function coingeckoRef(asset: Asset): AssetExternalRef | undefined {
  return asset.externalRefs?.find((r) => r.source === 'coingecko')
}

/**
 * Block explorer per chain, keyed exactly as the backend keys chains — the same
 * strings that appear in `onchain:<chain>` refs and on `holding.chain`
 * (`internal/adapter/coingecko/contracts.go`). Keeping the two lists spelled the
 * same way is what makes a mismatch a missing link rather than a wrong one.
 */
const EXPLORERS: Record<string, { token: string; address: string }> = {
  eth: { token: 'https://etherscan.io/token/', address: 'https://etherscan.io/address/' },
  base: { token: 'https://basescan.org/token/', address: 'https://basescan.org/address/' },
  arbitrum: { token: 'https://arbiscan.io/token/', address: 'https://arbiscan.io/address/' },
  optimism: {
    token: 'https://optimistic.etherscan.io/token/',
    address: 'https://optimistic.etherscan.io/address/',
  },
  linea: { token: 'https://lineascan.build/token/', address: 'https://lineascan.build/address/' },
  polygon: { token: 'https://polygonscan.com/token/', address: 'https://polygonscan.com/address/' },
  bsc: { token: 'https://bscscan.com/token/', address: 'https://bscscan.com/address/' },
  avalanche: { token: 'https://snowtrace.io/token/', address: 'https://snowtrace.io/address/' },
  solana: { token: 'https://solscan.io/token/', address: 'https://solscan.io/account/' },
  ton: { token: 'https://tonviewer.com/', address: 'https://tonviewer.com/' },
}

/**
 * Multi-chain address search, used when the chain is unknown.
 *
 * It is deliberately not a chain: the page asks every explorer it knows and
 * shows where the address exists, so the link stays useful without the UI
 * asserting a location it was never told. The alternative — picking a default —
 * is the bug being fixed.
 */
const CHAIN_AGNOSTIC_SEARCH = 'https://blockscan.com/address/'

/**
 * Explorer URL for an address on a chain. Unknown chain falls back to the
 * multi-chain search rather than to Ethereum; an unlisted chain returns nothing,
 * so a new chain shows a plain address instead of a link into the wrong network.
 */
export function explorerUrl(
  chain: string | undefined,
  address: string,
  kind: 'token' | 'address' = 'token'
): string | undefined {
  if (!address) return undefined
  if (!chain) return `${CHAIN_AGNOSTIC_SEARCH}${address}`
  const explorer = EXPLORERS[chain]
  if (!explorer) return undefined
  return `${explorer[kind]}${address}`
}

/** Explorer URL for a contract ref, chain included when it is known. */
export function contractUrl(ref: ContractRef | undefined): string | undefined {
  if (!ref) return undefined
  return explorerUrl(ref.chain, ref.address)
}

/** CoinGecko coin page. The id is an external ref, never derived from a symbol. */
export function coingeckoUrl(coinId: string): string {
  return `https://www.coingecko.com/en/coins/${coinId}`
}

/**
 * Address shortened for a table cell: enough of both ends to compare two
 * addresses by eye, which is the actual task — a lookalike token differs from
 * the real one somewhere, and the tail is where a generated vanity address
 * usually does not match.
 */
export function truncateAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 1) return address
  return `${address.slice(0, lead)}…${address.slice(-tail)}`
}
