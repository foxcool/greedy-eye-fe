// Connect-RPC endpoints for PortfolioService.
// All methods use POST to /eye.v1.PortfolioService/<Method>.
import { apiClient } from './client'
import type { Portfolio, Holding, Account, PortfolioValueResponse } from './backend-types'

const RPC = (method: string) => `/eye.v1.PortfolioService/${method}`

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

export async function deleteAccount(id: string): Promise<void> {
  await apiClient.post(RPC('DeleteAccount'), { id })
}

export interface SyncAccountResponse {
  accountId: string
  assetsUpserted: number
  holdingsUpserted: number
  errors: string[]
}

export async function syncAccount(accountId: string): Promise<SyncAccountResponse> {
  return apiClient.post<SyncAccountResponse>(RPC('SyncAccount'), { accountId })
}
