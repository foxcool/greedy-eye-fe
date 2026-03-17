import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createHolding,
  listHoldings,
  updateHolding,
  type ListHoldingsOptions,
} from '@/lib/api/portfolio-api'

export function useHoldingsQuery(opts: ListHoldingsOptions = {}) {
  return useQuery({
    queryKey: ['holdings', opts],
    queryFn: () => listHoldings(opts),
    enabled: Object.values(opts).some(Boolean), // only run if at least one filter set
  })
}

export function useCreateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createHolding>[0]) => createHolding(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  })
}

export function useUpdateHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof updateHolding>[1]) =>
      updateHolding(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  })
}
