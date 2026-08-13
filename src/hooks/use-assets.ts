import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addAssetRiskFlag,
  createAsset,
  deleteAsset,
  deleteAssetRiskFlag,
  getAsset,
  getLatestPrice,
  listAssets,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
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
