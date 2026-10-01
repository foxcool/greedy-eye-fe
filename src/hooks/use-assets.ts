import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addAssetRiskFlag,
  createAsset,
  deleteAsset,
  deleteAssetRiskFlag,
  getAsset,
  getLatestPrice,
  getPricingStatus,
  listAssets,
  listAssetsByIds,
  searchAssets,
  setAssetVerdict,
  updateAsset,
  type AddRiskFlagInput,
  type ListAssetsOptions,
} from '@/lib/api/assets-api'
import type { Asset, IdentityVerdict } from '@/lib/api/backend-types'

export function useAssets(opts?: ListAssetsOptions) {
  return useQuery({
    queryKey: ['assets', opts],
    queryFn: () => listAssets(opts),
  })
}

// useAssetsByIds reads the named assets only. The key is the sorted id list, so
// the same set asked in a different order is one cache entry.
export function useAssetsByIds(ids: string[] | undefined) {
  const key = ids ? [...new Set(ids)].sort() : undefined
  return useQuery({
    queryKey: ['assets', 'ids', key],
    queryFn: () => listAssetsByIds(key ?? []),
    enabled: key !== undefined,
  })
}

// useAssetSearch runs a server-side search, one page per verdict. Disabled
// until there is something to search for: an empty search box is not a
// request for the catalogue.
export function useAssetSearch(query: string, verdicts: IdentityVerdict[] | undefined, pageSize: number) {
  const q = query.trim()
  const enabled = q.length >= 2 || (verdicts !== undefined && verdicts.length > 0)
  return useQuery({
    queryKey: ['assets', 'search', q, verdicts, pageSize],
    enabled,
    queryFn: async () => {
      const pages = await Promise.all(
        (verdicts?.length ? verdicts : [undefined]).map((identityVerdict) =>
          searchAssets({ query: q || undefined, identityVerdict, pageSize })
        )
      )
      return { assets: pages.flatMap((p) => p.assets), truncated: pages.some((p) => p.truncated) }
    },
  })
}

// useAsset fetches one asset with its external refs and risk flags, which the
// list query never carries. Cached under its own key for that reason: a row from
// ['assets'] would satisfy the query while silently missing both.
export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => getAsset(id!),
    enabled: Boolean(id),
  })
}

// useLatestPrice reads the stored quote row itself, rather than the price map
// derived from heatmaps. The heatmap draws no node for a holding it could not
// value, so the map is empty for exactly the assets whose page needs to explain
// why — and an empty price beside a real position reads as "flat", not "absent".
//
// retry is off on purpose: a missing quote is the normal answer here, not a
// transient failure, and the default three attempts with backoff spend seconds
// re-asking for a row nobody stored.
export function useLatestPrice(assetId: string | undefined, baseAssetId = 'usd') {
  return useQuery({
    queryKey: ['price', 'latest', assetId, baseAssetId],
    queryFn: () => getLatestPrice(assetId!, baseAssetId),
    enabled: Boolean(assetId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

// usePricingStatus reports what asking these assets' price sources has produced.
// The valuation coverage block answers the same question but lists only the
// first 50 unpriced holdings, so a page that has to explain ONE position cannot
// rely on being in that sample.
//
// retry is off for the same reason as useLatestPrice: for an asset nobody has
// asked about, an absent record is the answer, not a transient failure.
export function usePricingStatus(assetIds: string[]) {
  // Sorted so that the same set of assets is one cache entry regardless of the
  // order the caller's list happened to arrive in.
  const key = [...assetIds].sort()
  return useQuery({
    queryKey: ['pricing-status', key],
    queryFn: () => getPricingStatus(key),
    enabled: key.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createAsset>[0]) => createAsset(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<Pick<Asset, 'name' | 'type' | 'symbol' | 'tags'>>) =>
      updateAsset(id, data),
    // The card reads ['asset', id], not the list — editing from the card must
    // refresh the card, or the dialog closes on the old name.
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['asset', id] })
    },
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export function useSetAssetVerdict() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      verdict,
    }: {
      id: string
      verdict: Exclude<IdentityVerdict, 'unknown'>
    }) => setAssetVerdict(id, verdict),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['asset', id] })
    },
  })
}

export function useAddAssetRiskFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddRiskFlagInput) => addAssetRiskFlag(input),
    // Only the single-asset query carries flags, so that is what has to refetch.
    onSuccess: (_flag, { assetId }) =>
      qc.invalidateQueries({ queryKey: ['asset', assetId] }),
  })
}

export function useDeleteAssetRiskFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assetId, id }: { assetId: string; id: string }) =>
      deleteAssetRiskFlag(assetId, id),
    onSuccess: (_void, { assetId }) =>
      qc.invalidateQueries({ queryKey: ['asset', assetId] }),
  })
}
