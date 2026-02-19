import type { components } from './api'

// Core domain models
export type Portfolio = components['schemas']['modelsPortfolio']
export type Holding = components['schemas']['modelsHolding']
export type Asset = components['schemas']['modelsAsset']
export type Price = components['schemas']['modelsPrice']
export type Transaction = components['schemas']['modelsTransaction']
export type Rule = components['schemas']['modelsRule']
export type RuleExecution = components['schemas']['modelsRuleExecution']
export type Account = components['schemas']['modelsAccount']
export type User = components['schemas']['modelsUser']

// Service responses
export type PortfolioValueResponse = components['schemas']['servicesPortfolioValueResponse']
export type PortfolioPerformanceResponse = components['schemas']['servicesPortfolioPerformanceResponse']

// Input types for forms
export type CreatePortfolioInput = Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>
export type UpdatePortfolioInput = Partial<CreatePortfolioInput>

export type CreateHoldingInput = Omit<Holding, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateHoldingInput = Partial<CreateHoldingInput>

export type CreateAssetInput = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateAssetInput = Partial<CreateAssetInput>
