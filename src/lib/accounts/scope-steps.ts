import type { AccountCapability } from '@/lib/api/backend-types'

export interface ScopeSteps {
  // Scopes to set before the account update, when some are being withdrawn.
  before?: AccountCapability[]
  // Scopes to set after it, when some are being granted.
  after?: AccountCapability[]
}

function sameSet(a: AccountCapability[], b: AccountCapability[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x))
}

// scopeSteps orders a scope change around the account update that carries the
// capabilities. The backend checks every save against the rule "a system scope
// is one of the account's capabilities", using whatever the other half holds at
// that moment. So a scope being withdrawn has to go before its capability does,
// and a scope being granted has to wait until its capability exists.
export function scopeSteps(current: AccountCapability[], wanted: AccountCapability[]): ScopeSteps {
  const kept = current.filter((s) => wanted.includes(s))
  return {
    before: sameSet(kept, current) ? undefined : kept,
    after: sameSet(wanted, kept) ? undefined : wanted,
  }
}
