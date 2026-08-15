import { apiClient } from './client'
import type {
  Asset,
  AssetPricingStatus,
  AssetRiskFlag,
  IdentityVerdict,
  RiskActionHint,
  RiskFlagKind,
  StoredPrice,
} from './backend-types'

const RPC = (method: string) => `/eye.v1.MarketDataService/${method}`

// --- Assets ---

export interface ListAssetsOptions {
  tags?: string[]
  pageSize?: number
  pageToken?: string
  // Filter by scam-filtering identity verdict; drives the Quarantine view.
  identityVerdict?: IdentityVerdict
}

// Backend pages default to 20 rows — follow nextPageToken to fetch everything.
export async function listAssets(opts: ListAssetsOptions = {}): Promise<Asset[]> {
  const all: Asset[] = []
  let pageToken = opts.pageToken
  for (let page = 0; page < 50; page++) {
    const body: Record<string, unknown> = { pageSize: opts.pageSize ?? 500 }
    if (opts.tags?.length) body['tags'] = opts.tags
    if (opts.identityVerdict) body['identityVerdict'] = opts.identityVerdict
    if (pageToken) body['pageToken'] = pageToken

    const res = await apiClient.post<{ assets?: Asset[]; nextPageToken?: string }>(
      RPC('ListAssets'),
      body
    )
    all.push(...(res.assets ?? []))
    if (!res.nextPageToken) break
    pageToken = res.nextPageToken
  }
  return all
}

// getAsset is the only RPC that loads external refs and risk flags. Every other
// asset read returns them empty, and an empty list there means "not loaded" —
// so a view that shows bindings or risk has to fetch through here.
export async function getAsset(id: string): Promise<Asset> {
  return apiClient.post<Asset>(RPC('GetAsset'), { id })
}

// setAssetVerdict records a human identity verdict; it is terminal — the
// automated scorer never overwrites it. Admin-only on the backend.
export async function setAssetVerdict(
  assetId: string,
  verdict: Exclude<IdentityVerdict, 'unknown'>
): Promise<Asset> {
  return apiClient.post<Asset>(RPC('SetAssetVerdict'), { assetId, verdict })
}

export async function createAsset(data: {
  id: string
  name: string
  type: Asset['type']
  symbol?: string
  tags?: string[]
}): Promise<Asset> {
  return apiClient.post<Asset>(RPC('CreateAsset'), {
    asset: {
      id: data.id,
      name: data.name,
      type: data.type,
      symbol: data.symbol,
      tags: data.tags ?? [],
    },
  })
}

export async function updateAsset(
  id: string,
  data: Partial<Pick<Asset, 'name' | 'type' | 'symbol' | 'tags'>>
): Promise<Asset> {
  return apiClient.post<Asset>(RPC('UpdateAsset'), {
    asset: { id, ...data },
  })
}

export async function deleteAsset(id: string): Promise<void> {
  await apiClient.post(RPC('DeleteAsset'), { id })
}

// --- Risk flags (identity axis 2) ---

export interface AddRiskFlagInput {
  assetId: string
  kind: RiskFlagKind
  note?: string
  actionHint?: RiskActionHint
  // REQUIRED, ISO datetime. The backend rejects a flag without it: a risk that
  // never expires stops being read at all.
  reviewAt: string
}

export async function addAssetRiskFlag(input: AddRiskFlagInput): Promise<AssetRiskFlag> {
  return apiClient.post<AssetRiskFlag>(RPC('AddAssetRiskFlag'), input)
}

// Flags accumulate rather than replace, so removing one is its own call.
export async function deleteAssetRiskFlag(assetId: string, id: string): Promise<void> {
  await apiClient.post(RPC('DeleteAssetRiskFlag'), { assetId, id })
}

// --- Prices ---

export async function getLatestPrice(assetId: string, baseAssetId = 'usd'): Promise<StoredPrice> {
  return apiClient.post<StoredPrice>(RPC('GetLatestPrice'), { assetId, baseAssetId })
}

// getPricingStatus answers "what has asking about this asset produced" without
// the cap the valuation coverage list carries: the coverage report lists at most
// 50 unpriced holdings while counting them all, so on a synced wallet a given
// position is usually outside the sample and its reason goes undisclosed. This
// asks about the assets in hand instead.
//
// Assets never asked about come back absent, not empty — the caller has to read
// a missing entry as "no source has ever been asked", which is why this returns
// the array as given rather than filling gaps.
export async function getPricingStatus(assetIds: string[]): Promise<AssetPricingStatus[]> {
  if (assetIds.length === 0) return []
  const res = await apiClient.post<{ statuses?: AssetPricingStatus[] }>(
    RPC('GetPricingStatus'),
    { assetIds }
  )
  return res.statuses ?? []
}

export async function fetchExternalPrices(assetIds: string[]): Promise<{
  pricesFetched: number
  pricesStored: number
  errors: string[]
}> {
  return apiClient.post(RPC('FetchExternalPrices'), { assetIds })
}

export interface ListPriceHistoryOptions {
  from?: string // ISO datetime
  to?: string // ISO datetime
  sourceId?: string
  pageSize?: number
}

// Stored price history for one asset, oldest-to-newest as returned by the backend.
// Follows nextPageToken to gather the full requested range.
export async function listPriceHistory(
  assetId: string,
  baseAssetId = 'usd',
  opts: ListPriceHistoryOptions = {}
): Promise<StoredPrice[]> {
  const all: StoredPrice[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 50; page++) {
    const body: Record<string, unknown> = {
      assetId,
      baseAssetId,
      pageSize: opts.pageSize ?? 500,
    }
    if (opts.from) body['from'] = opts.from
    if (opts.to) body['to'] = opts.to
    if (opts.sourceId) body['sourceId'] = opts.sourceId
    if (pageToken) body['pageToken'] = pageToken

    const res = await apiClient.post<{ prices?: StoredPrice[]; nextPageToken?: string }>(
      RPC('ListPriceHistory'),
      body
    )
    all.push(...(res.prices ?? []))
    if (!res.nextPageToken) break
    pageToken = res.nextPageToken
  }
  return all
}
