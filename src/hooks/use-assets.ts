import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAsset,
  deleteAsset,
  listAssets,
  setAssetVerdict,
  updateAsset,
  type ListAssetsOptions,
} from '@/lib/api/assets-api'
import type { Asset, IdentityVerdict } from '@/lib/api/backend-types'

export function useAssets(opts?: ListAssetsOptions) {
  return useQuery({
    queryKey: ['assets', opts],
    queryFn: () => listAssets(opts),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}
