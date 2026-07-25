# Greedy Eye Frontend — Claude Context

## Current State (2026-06)

**Status**: Backend integrated. Auth via psina (forwardAuth). Connect-RPC API layer.

### What's Implemented
- Dashboard (`/`): macro/world-finance overview — interest rates, markets, crypto,
  news widgets (mock data source, designed to swap for real fetchers)
- Portfolios: `/portfolios` aggregate overview + list; `/portfolios/[id]` with
  Overview / Holdings / Settings tabs, scoped via PortfolioScopeProvider
- Target allocations: per-asset target % persisted in an AutomationService rule
  (rule_type `target_allocation`, configuration.targets keyed by asset UUID);
  edited in the portfolio Settings tab; drives Target-vs-Current display
- Rules (`/rules`): lists the user's rules + Actions tab (manual buy/sell derived
  from current-vs-target deviations)
- Prices (`/prices`): asset price table + history chart (ListPriceHistory)
- Settings (`/settings`): psina PAT management (for MCP/external apps) + Accounts
  (Accounts moved here; `/accounts` redirects to `/settings`)
- Live CoinGecko prices (60s polling) with mock fallback
- Backend mode: holdings/accounts/assets from backend API, value from CalculatePortfolioValue
- Auth: login/register pages, auth-context, protected routes, auto-refresh on 401
- Sidebar nav: Dashboard, Portfolios, Rules, Prices, Assets, Settings

## Technology Stack

- **Framework**: Next.js 16 (App Router), TypeScript
- **Styling**: Tailwind CSS + shadcn/ui (zinc theme)
- **State**: TanStack Query v5 (server), React state (local)
- **API**: Connect-RPC via fetch (POST to `/eye.v1.*` endpoints)
- **Auth**: psina service via Traefik forwardAuth (X-User-Id header)

## Dev Workflow

**Canonical local dev is `make up` (Docker + `deploy/compose.yaml`), not `npm run dev`.**
The two modes differ in *auth*, which matters when debugging sessions:

```bash
# Docker (canonical) — real psina auth via Traefik forwardAuth, cookie+JWT
# refresh flow. Mock is disabled (compose sets NEXT_PUBLIC_MOCK_USER_ID="").
make up                # deploy/compose.yaml on the shared `proxy` network
# → https://${EYE_DOMAIN}/app

# Bare npm — mock user: .env.local sets NEXT_PUBLIC_MOCK_USER_ID, so checkAuth
# short-circuits and the client injects X-User-Id. Verify/Refresh never run —
# do NOT use this to reproduce auth/session bugs.
npm run dev           # → http://localhost:3000
```

Checks run inside the dev container (its `node_modules`), not on the host:

```bash
make lint             # ESLint
make typecheck        # tsc --noEmit
make check            # typecheck + lint + build — run before committing
```

Note: `make up` runs `npm run dev` (Turbopack) with on-demand compilation, so
requests serialize on first load — concurrency/timing races that need a burst
of parallel requests (e.g. the refresh-rotation race) may only surface on the
prebuilt prod image, not locally.

See [docs/development.md](docs/development.md) for the full multi-service stack.

## Key Files

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Header + Sidebar (NAV_LINKS)
│   │   ├── page.tsx            # Macro dashboard
│   │   ├── portfolios/         # aggregate + list; [id] Overview/Holdings/Settings
│   │   │   └── [id]/components/ # holdings-manager, portfolio-settings, target-allocation-editor
│   │   ├── rules/              # /rules page
│   │   ├── prices/             # /prices page
│   │   ├── settings/           # PAT management + Accounts
│   │   ├── accounts/           # redirects to /settings
│   │   └── assets/
│   ├── login/ register/        # Auth pages
│   └── providers.tsx           # QueryClient + ThemeProvider
├── components/
│   ├── portfolio/              # Summary card, holdings table, allocation bars/chart/targets
│   ├── macro/                  # Macro dashboard widgets
│   ├── rules/                  # Rules view + portfolio actions
│   └── prices/                 # Price table + history chart
├── hooks/
│   ├── use-portfolio.ts        # Dashboard/portfolio data (backend/coingecko/mock); targets from rule when scoped
│   ├── use-portfolios.ts       # Portfolio CRUD hooks
│   ├── use-rules.ts            # Rules + target-allocation save/delete
│   ├── use-pats.ts             # psina PAT management
│   ├── use-price-history.ts    # Price history for /prices
│   ├── use-macro.ts            # Macro snapshot (mock)
│   ├── use-holdings.ts  use-accounts.ts  use-assets.ts  use-prices.ts
└── lib/
    ├── api/
    │   ├── client.ts           # ApiClient (relative URLs, 401→refresh→retry)
    │   ├── portfolio-api.ts    # PortfolioService Connect-RPC calls
    │   ├── automation-api.ts   # AutomationService (rules) + target helpers
    │   ├── assets-api.ts       # MarketDataService (assets, prices, history)
    │   ├── adapters.ts         # Backend → RawHolding conversion
    │   └── backend-types.ts    # TypeScript types for backend responses
    ├── auth/
    │   ├── api.ts              # login/logout/checkAuth/refreshToken
    │   ├── pat-api.ts          # psina PAT create/list/revoke (cookie session)
    │   └── auth-context.tsx    # useAuth() hook
    ├── portfolio-scope.tsx     # PortfolioScopeProvider — scopes usePortfolio by id
    ├── config/                 # dashboard-widgets, query-client
    └── mocks/                  # Fallback mock data + CoinGecko fetcher + macro
```

## Environment Variables

```bash
# .env.local (local dev — NOT used by Docker)
NEXT_PUBLIC_API_URL=http://localhost:8080    # direct backend
NEXT_PUBLIC_USE_BACKEND=true
NEXT_PUBLIC_USE_LIVE_PRICES=true
NEXT_PUBLIC_MOCK_USER_ID=dev-user-local     # injects X-User-Id for direct access
```

Docker gets env from `deploy/compose.yaml` (empty API_URL = relative URLs via Traefik).

## Auth Flow

```
Browser → Traefik → psina /verify (forwardAuth)
                         ↓ 200 + X-User-Id header
                    → eye-fe (Next.js)
                    → eye (backend)
```
- Local dev with `NEXT_PUBLIC_MOCK_USER_ID`: injects header directly, no psina needed
- Token TTL: 15min. client.ts auto-calls `/auth.v1.AuthService/Refresh` on 401

## Data Flow (use-portfolio.ts)

1. `USE_BACKEND=true` → listHoldings + listAccounts + listAssets (scoped by
   portfolioId via PortfolioScopeProvider when on a detail page; aggregate
   otherwise) → CoinGecko prices → calculatePortfolio(). When scoped, also
   listRules({portfolioId}) → target_allocation targets feed Target-vs-Current
   (keyed by backend asset UUID, matching holdings)
2. `USE_LIVE_PRICES=true` → mock holdings + CoinGecko prices
3. fallback → mock holdings + mock prices

Portfolio totals shown across the page (header, summary card, holdings) all use
the client-side calculatePortfolio total for consistency.

## PAT / MCP auth (settings)

psina personal access tokens (`psn_…`) let external apps (e.g. greedy-eye-mcp)
authenticate. Managed at `/settings` via `lib/auth/pat-api.ts` (relative POST to
`/auth.v1.AuthService/*`, cookie session). psina accepts the session cookie for
PAT-management RPCs (no Authorization header from the browser).

## Add shadcn Component

```bash
npx shadcn@latest add [component-name]
```
