// Connect-RPC endpoints for PortfolioService.
// All methods use POST to /eye.v1.PortfolioService/<Method>.
import { apiClient } from './client'
import type { Portfolio, Holding, Account, PortfolioValueResponse, Provider } from './backend-types'

const RPC = (method: string) => `/eye.v1.PortfolioService/${method}`

// Connect JSON renders a FieldMask as comma-separated camelCase paths, which is
// exactly the shape of the keys a partial update already carries. Deriving the
// mask from the payload is what makes it impossible to forget: without one the
// backend used to write every field it knows, so an update that sent only
// `excluded` zeroed the holding's amount and decimals and detached it from its
// portfolio. The backend now rejects a mask-less update outright.
function maskOf(data: object): string {
  const paths = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)
  if (paths.length === 0) throw new Error('update requires at least one field')
  return paths.join(',')
}

// --- Portfolios ---

export async function listPortfolios(): Promise<Portfolio[]> {
  const res = await apiClient.post<{ portfolios?: Portfolio[] }>(RPC('ListPortfolios'), {
    pageSize: 500,
  })
  return res.portfolios ?? []
}

export async function createPortfolio(name: string, description?: string): Promise<Portfolio> {
  return apiClient.post<Portfolio>(RPC('CreatePortfolio'), {
    portfolio: { name, description },
  })
}

export async function updatePortfolio(
  id: string,
  data: Partial<Pick<Portfolio, 'name' | 'description'>>
): Promise<Portfolio> {
  return apiClient.post<Portfolio>(RPC('UpdatePortfolio'), {
    portfolio: { id, ...data },
    updateMask: maskOf(data),
  })
}

export async function deletePortfolio(id: string): Promise<void> {
  await apiClient.post(RPC('DeletePortfolio'), { id })
}

export async function getPortfolio(id: string): Promise<Portfolio> {
  return apiClient.post<Portfolio>(RPC('GetPortfolio'), { id })
}

export async function calculatePortfolioValue(
  portfolioId: string,
  quoteAssetId = 'usd'
): Promise<PortfolioValueResponse> {
  return apiClient.post<PortfolioValueResponse>(RPC('CalculatePortfolioValue'), {
    portfolioId,
    quoteAssetId,
  })
}

// --- Holdings ---

export interface ListHoldingsOptions {
  portfolioId?: string
  accountId?: string
  assetId?: string
}

// Backend pages default to 20 rows — follow nextPageToken to fetch everything.
export async function listHoldings(opts: ListHoldingsOptions = {}): Promise<Holding[]> {
  const all: Holding[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 50; page++) {
    const body: Record<string, unknown> = { pageSize: 500 }
    if (opts.portfolioId) body['portfolioId'] = opts.portfolioId
    if (opts.accountId) body['accountId'] = opts.accountId
    if (opts.assetId) body['assetId'] = opts.assetId
    if (pageToken) body['pageToken'] = pageToken

    const res = await apiClient.post<{ holdings?: Holding[]; nextPageToken?: string }>(
      RPC('ListHoldings'),
      body
    )
    all.push(...(res.holdings ?? []))
    if (!res.nextPageToken) break
    pageToken = res.nextPageToken
  }
  return all
}

export async function createHolding(data: {
  amount: string
  decimals: number
  assetId: string
  accountId: string
  portfolioId?: string
}): Promise<Holding> {
  return apiClient.post<Holding>(RPC('CreateHolding'), {
    holding: {
      amount: data.amount,
      decimals: data.decimals,
      assetId: data.assetId,
      accountId: data.accountId,
      portfolioId: data.portfolioId,
    },
  })
}

export async function updateHolding(
  id: string,
  data: Partial<Pick<Holding, 'amount' | 'decimals' | 'excluded'>>
): Promise<Holding> {
  return apiClient.post<Holding>(RPC('UpdateHolding'), {
    holding: { id, ...data },
    updateMask: maskOf(data),
  })
}

export async function deleteHolding(id: string): Promise<void> {
  await apiClient.post(RPC('DeleteHolding'), { id })
}

// --- Accounts ---

export async function listAccounts(): Promise<Account[]> {
  const res = await apiClient.post<{ accounts?: Account[] }>(RPC('ListAccounts'), {
    pageSize: 500,
  })
  return res.accounts ?? []
}

export async function createAccount(input: {
  name: string
  type: Account['type']
  description?: string
  data?: Record<string, string>
  portfolioId?: string
  capabilities?: Account['capabilities']
  // Admin-only; the backend rejects it for non-admin users.
  systemScopes?: Account['systemScopes']
}): Promise<Account> {
  return apiClient.post<Account>(RPC('CreateAccount'), {
    account: {
      name: input.name,
      type: input.type,
      description: input.description,
      data: input.data,
      portfolioId: input.portfolioId || undefined,
      capabilities: input.capabilities,
      systemScopes: input.systemScopes,
    },
  })
}

export async function updateAccount(
  id: string,
  input: Partial<Pick<Account, 'name' | 'description' | 'type' | 'data' | 'portfolioId' | 'capabilities'>>
): Promise<Account> {
  return apiClient.post<Account>(RPC('UpdateAccount'), {
    account: { id, ...input },
    updateMask: maskOf(input),
  })
}

// System scopes are deliberately outside the default update mask on the
// backend; mutating them needs an explicit mask (camelCase in Connect JSON)
// and the admin role.
export async function updateSystemScopes(
  id: string,
  systemScopes: Account['systemScopes']
): Promise<Account> {
  return apiClient.post<Account>(RPC('UpdateAccount'), {
    account: { id, systemScopes },
    updateMask: 'systemScopes',
  })
}

// --- Providers ---

// listProviders describes the external services an account can be created
// against: which slug to name, whether a key and secret are wanted, which
// chains the provider reads, which plans it is metered under, and any extra
// field it cannot work without.
//
// It returns descriptions, never credentials, and the catalogue is identical
// for every caller. The point of asking the backend rather than keeping a list
// here is that a list here would be a second copy of the registry — and the
// two would drift the first time an adapter was added.
export async function listProviders(): Promise<Provider[]> {
  const res = await apiClient.post<{ providers?: Provider[] }>(RPC('ListProviders'), {})
  return res.providers ?? []
}

// cascade also removes the account's positions. Transaction history is never
// removed this way — the backend refuses the request instead.
export async function deleteAccount(id: string, cascade = false): Promise<void> {
  await apiClient.post(RPC('DeleteAccount'), { id, cascade })
}

export interface SyncAccountResponse {
  accountId: string
  assetsUpserted: number
  holdingsUpserted: number
  errors: string[]
}

// A sync fans out to a provider per chain and then rewrites the account's
// positions: measured at ~22s for a heavy EVM wallet, against a client default
// of 10s. It also carries its own server-side deadline now, so a timeout here
// only means "stop waiting", never "stop the write".
//
// retries: 0 because this is a write. The default single retry re-sent an
// aborted sync while the first one was still running on the server, pointing
// two concurrent writers at the same account's rows.
export async function syncAccount(accountId: string): Promise<SyncAccountResponse> {
  return apiClient.post<SyncAccountResponse>(RPC('SyncAccount'), { accountId }, {
    // Deliberately longer than the backend's syncTimeout (3 min), so the
    // deadline that fires is the server's and the user sees its error rather
    // than a bare client abort.
    timeout: 210_000,
    retries: 0,
  })
}
