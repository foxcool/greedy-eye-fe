import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createHolding,
  deleteHolding,
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
    // Also the portfolio summary: excluding a position changes the total and the
    // coverage block that explains it. Refreshing only ['holdings'] leaves the
    // toggle and the sentence beside it disagreeing until something else
    // refetches — the row dims while the page still says why it is counted.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

export function useDeleteHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteHolding(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holdings'] }),
  })
}
