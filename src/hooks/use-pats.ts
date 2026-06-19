import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPAT, listPATs, revokePAT } from '@/lib/auth/pat-api'

export function usePATs() {
  return useQuery({
    queryKey: ['pats'],
    queryFn: listPATs,
  })
}

export function useCreatePAT() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, expiresAt }: { name: string; expiresAt?: number }) =>
      createPAT(name, expiresAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pats'] }),
  })
}

export function useRevokePAT() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revokePAT(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pats'] }),
  })
}
