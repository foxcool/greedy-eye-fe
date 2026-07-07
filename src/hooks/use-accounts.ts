import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createAccount, deleteAccount, listAccounts, updateAccount, updateSystemScopes } from '@/lib/api/portfolio-api'
import type { Account } from '@/lib/api/backend-types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: listAccounts,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createAccount>[0]) => createAccount(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<Pick<Account, 'name' | 'description' | 'type' | 'data' | 'portfolioId' | 'capabilities'>>) =>
      updateAccount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

// Admin-only: system scopes need their own RPC call with an explicit update mask.
export function useUpdateSystemScopes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, systemScopes }: { id: string; systemScopes: Account['systemScopes'] }) =>
      updateSystemScopes(id, systemScopes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}
