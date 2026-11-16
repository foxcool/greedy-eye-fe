// Settings -> Accounts is where an account's custody details (type, address,
// chain) live; views that only name the account link here instead of
// repeating them. The anchor and the row id must agree, hence one source.
export function accountRowId(accountId: string): string {
  return `account-${accountId}`
}

export function accountSettingsHref(accountId: string): string {
  return `/settings#${accountRowId(accountId)}`
}
