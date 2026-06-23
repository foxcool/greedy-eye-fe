import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  buildTargetRule,
  TARGET_ALLOCATION_RULE_TYPE,
  type TargetsMap,
} from '@/lib/api/automation-api'
import type { Rule } from '@/lib/api/backend-types'

export function useRules(portfolioId?: string) {
  return useQuery({
    queryKey: ['rules', portfolioId ?? 'all'],
    queryFn: () => listRules(portfolioId ? { portfolioId } : {}),
  })
}

// The single target_allocation rule for a portfolio (undefined if none yet).
export function useTargetAllocationRule(portfolioId: string) {
  const query = useRules(portfolioId)
  const rule = query.data?.find((r) => r.ruleType === TARGET_ALLOCATION_RULE_TYPE)
  return { ...query, rule }
}

// Invalidate both the rules list and portfolio summaries (allocations depend on targets).
function useInvalidateRules() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['rules'] })
    qc.invalidateQueries({ queryKey: ['portfolio'] })
  }
}

export function useSaveTargetAllocation(portfolioId: string) {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: ({ targets, existing }: { targets: TargetsMap; existing?: Rule }) => {
      const payload = buildTargetRule(portfolioId, targets, existing)
      return existing?.id ? updateRule(payload, ['configuration']) : createRule(payload)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteRule() {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: invalidate,
  })
}
