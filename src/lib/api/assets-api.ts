import { apiClient } from './client'
import type { Asset, StoredPrice } from './backend-types'

const RPC = (method: string) => `/eye.v1.MarketDataService/${method}`

// --- Assets ---

export interface ListAssetsOptions {
  tags?: string[]
  pageSize?: number
  pageToken?: string
}

export async function listAssets(opts: ListAssetsOptions = {}): Promise<Asset[]> {
  const body: Record<string, unknown> = {}
  if (opts.tags?.length) body['tags'] = opts.tags
  if (opts.pageSize) body['pageSize'] = opts.pageSize
  if (opts.pageToken) body['pageToken'] = opts.pageToken

  const res = await apiClient.post<{ assets?: Asset[] }>(RPC('ListAssets'), body)
  return res.assets ?? []
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

// --- Prices ---

export async function getLatestPrice(assetId: string, baseAssetId = 'usd'): Promise<StoredPrice> {
  return apiClient.post<StoredPrice>(RPC('GetLatestPrice'), { assetId, baseAssetId })
}

export async function fetchExternalPrices(assetIds: string[]): Promise<{
  pricesFetched: number
  pricesStored: number
  errors: string[]
}> {
  return apiClient.post(RPC('FetchExternalPrices'), { assetIds })
}
