import type { Asset, AssetType, IdentityVerdict } from '@/lib/api/backend-types'

export const ASSET_TYPE_LABELS: Record<string, string> = {
  ASSET_TYPE_CRYPTOCURRENCY: 'Crypto',
  ASSET_TYPE_STOCK: 'Stock',
  ASSET_TYPE_BOND: 'Bond',
  ASSET_TYPE_COMMODITY: 'Commodity',
  ASSET_TYPE_FOREX: 'Forex',
  ASSET_TYPE_FUND: 'Fund',
}

export function assetTypeLabel(type: AssetType | string): string {
  return ASSET_TYPE_LABELS[type] ?? type
}

/**
 * The verdicts that keep a holding out of the total. "unknown" and "legit" count;
 * these three do not, until a person says otherwise.
 */
export const FLAGGED_VERDICTS: ReadonlySet<IdentityVerdict> = new Set([
  'suspect',
  'impersonation',
  'scam',
])

export function isFlagged(asset: Pick<Asset, 'identityVerdict'> | undefined): boolean {
  return Boolean(asset?.identityVerdict && FLAGGED_VERDICTS.has(asset.identityVerdict))
}

/** A verdict a person set. Terminal: the scorer never overwrites it. */
export function isHumanVerdict(source: string | undefined): boolean {
  return Boolean(source?.startsWith('user:'))
}
