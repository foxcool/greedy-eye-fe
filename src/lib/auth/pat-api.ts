// Personal Access Token (PAT) API — psina service, cookie session.
//
// PATs (psn_...) let external tools (e.g. the MCP server) authenticate to the
// greedy-eye backend on the user's behalf. Management endpoints require a
// session JWT; the browser session lives in the HttpOnly psina_access cookie, so
// these calls rely on credentials:'include' (psina reads the session from the
// cookie). int64 fields arrive as JSON strings; 0 means "never".

const AUTH_BASE = '/auth.v1.AuthService'

export interface PersonalAccessToken {
  id: string
  name: string
  scopes: string[]
  createdAt: number // unix seconds
  expiresAt: number // unix seconds; 0 = never
  lastUsedAt: number // unix seconds; 0 = never used
}

export interface CreatedPAT {
  // Plaintext token, returned once at creation and never again.
  token: string
  pat: PersonalAccessToken
}

interface RawPAT {
  id?: string
  name?: string
  scopes?: string[]
  createdAt?: string | number
  expiresAt?: string | number
  lastUsedAt?: string | number
}

function num(v: string | number | undefined): number {
  return v ? Number(v) : 0
}

function toPAT(raw: RawPAT): PersonalAccessToken {
  return {
    id: raw.id ?? '',
    name: raw.name ?? '',
    scopes: raw.scopes ?? [],
    createdAt: num(raw.createdAt),
    expiresAt: num(raw.expiresAt),
    lastUsedAt: num(raw.lastUsedAt),
  }
}

async function authPost<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`${AUTH_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(detail.message || `PAT ${method} failed (HTTP ${res.status})`)
  }
  return (await res.json().catch(() => ({}))) as T
}

export async function createPAT(name: string, expiresAt = 0): Promise<CreatedPAT> {
  const res = await authPost<{ token?: string; pat?: RawPAT }>(
    'CreatePersonalAccessToken',
    { name, scopes: [], expiresAt }
  )
  return { token: res.token ?? '', pat: toPAT(res.pat ?? {}) }
}

export async function listPATs(): Promise<PersonalAccessToken[]> {
  const res = await authPost<{ pats?: RawPAT[] }>('ListPersonalAccessTokens', {})
  return (res.pats ?? []).map(toPAT)
}

export async function revokePAT(id: string): Promise<void> {
  await authPost('RevokePersonalAccessToken', { id })
}
