// Connect-RPC endpoints for PortfolioService.
// All methods use POST to /eye.v1.PortfolioService/<Method>.
import { apiClient } from './client'
import type { Portfolio, Holding, Account, PortfolioValueResponse } from './backend-types'

const RPC = (method: string) => `/eye.v1.PortfolioService/${method}`

// --- Portfolios ---

export async function listPortfolios(): Promise<Portfolio[]> {
  const res = await apiClient.post<{ portfolios?: Portfolio[] }>(RPC('ListPortfolios'), {})
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

export async function listHoldings(opts: ListHoldingsOptions = {}): Promise<Holding[]> {
  const body: Record<string, string> = {}
  if (opts.portfolioId) body['portfolioId'] = opts.portfolioId
  if (opts.accountId) body['accountId'] = opts.accountId
  if (opts.assetId) body['assetId'] = opts.assetId

  const res = await apiClient.post<{ holdings?: Holding[] }>(RPC('ListHoldings'), body)
  return res.holdings ?? []
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
  data: Partial<Pick<Holding, 'amount' | 'decimals'>>
): Promise<Holding> {
  return apiClient.post<Holding>(RPC('UpdateHolding'), {
    holding: { id, ...data },
  })
}

// --- Accounts ---

export async function listAccounts(): Promise<Account[]> {
  const res = await apiClient.post<{ accounts?: Account[] }>(RPC('ListAccounts'), {})
  return res.accounts ?? []
}

export async function createAccount(data: {
  name: string
  type: Account['type']
  description?: string
}): Promise<Account> {
  return apiClient.post<Account>(RPC('CreateAccount'), {
    account: { name: data.name, type: data.type, description: data.description },
  })
}

export async function updateAccount(
  id: string,
  data: Partial<Pick<Account, 'name' | 'description' | 'type'>>
): Promise<Account> {
  return apiClient.post<Account>(RPC('UpdateAccount'), {
    account: { id, ...data },
  })
}

export async function deleteAccount(id: string): Promise<void> {
  await apiClient.post(RPC('DeleteAccount'), { id })
}
