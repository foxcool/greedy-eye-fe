import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPortfolio,
  deletePortfolio,
  listPortfolios,
  setPortfolioExcludedFromTotals,
  updatePortfolio,
} from '@/lib/api/portfolio-api'

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: listPortfolios,
  })
}

export function useCreatePortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createPortfolio(name, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}

export function useUpdatePortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      name,
      description,
    }: {
      id: string
      name: string
      description?: string
    }) => updatePortfolio(id, { name, description }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}

// Moving a portfolio in or out of the totals changes every cross-portfolio
// figure, not only its own row: the summed value, the balance map, the held
// list.
export function useSetPortfolioExcludedFromTotals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, excluded }: { id: string; excluded: boolean }) =>
      setPortfolioExcludedFromTotals(id, excluded),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolios'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['heatmap'] })
      qc.invalidateQueries({ queryKey: ['holdings'] })
    },
  })
}

export function useDeletePortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePortfolio(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}
