import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPortfolio,
  deletePortfolio,
  listPortfolios,
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

export function useDeletePortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePortfolio(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}
