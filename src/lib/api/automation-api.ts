// Connect-RPC endpoints for AutomationService.
// All methods use POST to /eye.v1.AutomationService/<Method>.
import { apiClient } from './client'
import type { Rule } from './backend-types'

const RPC = (method: string) => `/eye.v1.AutomationService/${method}`

export const TARGET_ALLOCATION_RULE_TYPE = 'target_allocation'

export interface ListRulesOptions {
  portfolioId?: string
  ruleType?: string
}

// Backend pages default to a small size — follow nextPageToken to fetch everything.
export async function listRules(opts: ListRulesOptions = {}): Promise<Rule[]> {
  const all: Rule[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 50; page++) {
    const body: Record<string, unknown> = { pageSize: 500 }
    if (opts.portfolioId) body['portfolioId'] = opts.portfolioId
    if (opts.ruleType) body['ruleType'] = opts.ruleType
    if (pageToken) body['pageToken'] = pageToken

    const res = await apiClient.post<{ rules?: Rule[]; nextPageToken?: string }>(
      RPC('ListRules'),
      body
    )
    all.push(...(res.rules ?? []))
    if (!res.nextPageToken) break
    pageToken = res.nextPageToken
  }
  return all
}

export async function getRule(id: string): Promise<Rule> {
  return apiClient.post<Rule>(RPC('GetRule'), { id })
}

export async function createRule(rule: Partial<Rule>): Promise<Rule> {
  return apiClient.post<Rule>(RPC('CreateRule'), { rule })
}

export async function updateRule(rule: Partial<Rule>, updateMask?: string[]): Promise<Rule> {
  const body: Record<string, unknown> = { rule }
  if (updateMask) body['updateMask'] = updateMask.join(',')
  return apiClient.post<Rule>(RPC('UpdateRule'), body)
}

export async function deleteRule(id: string): Promise<void> {
  await apiClient.post(RPC('DeleteRule'), { id })
}

// --- target_allocation helpers ---

export type TargetsMap = Record<string, number>

// Reads the per-asset target percentages from a rule's configuration.
export function readTargets(rule: Rule | undefined): TargetsMap {
  const raw = rule?.configuration?.['targets']
  if (!raw || typeof raw !== 'object') return {}
  const out: TargetsMap = {}
  for (const [assetId, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(value)
    if (Number.isFinite(n)) out[assetId] = n
  }
  return out
}

// Builds a Rule payload for create/update of the portfolio's target allocation.
export function buildTargetRule(
  portfolioId: string,
  targets: TargetsMap,
  existing?: Rule
): Partial<Rule> {
  return {
    ...(existing?.id ? { id: existing.id } : {}),
    name: existing?.name || 'Target allocation',
    ruleType: TARGET_ALLOCATION_RULE_TYPE,
    portfolioId,
    status: existing?.status ?? 'RULE_STATUS_ACTIVE',
    configuration: { targets },
  }
}
