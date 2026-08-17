// Merging rules for accounts.data — the map that carries an account's
// credentials and the settings that go beside them.
//
// Kept out of the form component on purpose: this is the part where being
// wrong is silent. UpdateAccount writes `data` by REPLACEMENT, so whatever the
// caller sends is the whole map afterwards.

/**
 * mergeAccountData keeps the keys a form never rendered.
 *
 * The account form used to build `data` from scratch, so every key outside its
 * fixed field set was erased on save. Filed as "editing drops the tier", it grew
 * teeth when the provider budget moved onto the account (backend v0.7.0): the
 * erased set became `quota`, `period`, `rps`, `burst` and `root_ca`. One save
 * from the UI could un-budget a plan shared between two deployments, or remove
 * the trust anchor an API is only reachable through — and both fail hours
 * later, inside a sweep, as silence rather than as an error.
 *
 * The rule: a form owns the keys it renders and nothing else.
 * - a rendered key with a value → written
 * - a rendered key left blank → deleted, because a person looking at an empty
 *   field means it to be empty
 * - a key the form never showed → carried through untouched
 *
 * @param existing the account's stored data, as the server last returned it
 * @param owned the keys this form rendered; `undefined` and blank both mean delete
 */
export function mergeAccountData(
  existing: Record<string, string> | undefined,
  owned: Record<string, string | undefined>
): Record<string, string> {
  const merged: Record<string, string> = { ...(existing ?? {}) }
  for (const [key, value] of Object.entries(owned)) {
    const trimmed = value?.trim() ?? ''
    if (trimmed === '') {
      delete merged[key]
    } else {
      merged[key] = trimmed
    }
  }
  return merged
}
