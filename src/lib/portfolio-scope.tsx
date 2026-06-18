'use client'

import { createContext, useContext } from 'react'

/**
 * Portfolio scope context.
 *
 * The rich portfolio components (summary, allocation, holdings table) read
 * `usePortfolio()` directly. By default that aggregates holdings across ALL
 * portfolios. Wrapping a subtree in `PortfolioScopeProvider` scopes those same
 * components to a single portfolio without prop-drilling through each one.
 */
interface PortfolioScope {
  portfolioId?: string
}

const PortfolioScopeContext = createContext<PortfolioScope>({})

export function PortfolioScopeProvider({
  portfolioId,
  children,
}: {
  portfolioId?: string
  children: React.ReactNode
}) {
  return (
    <PortfolioScopeContext.Provider value={{ portfolioId }}>
      {children}
    </PortfolioScopeContext.Provider>
  )
}

export function usePortfolioScope(): PortfolioScope {
  return useContext(PortfolioScopeContext)
}
