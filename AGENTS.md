# Greedy Eye Frontend — Claude Context

## Current State (2026-03-17)

**Status**: Backend integrated. Auth via psina (forwardAuth). Connect-RPC API layer.

### What's Implemented
- Dashboard: total portfolio value, 24h change, holdings table, allocation bars
- Live CoinGecko prices (60s polling) with mock fallback
- Backend mode: holdings/accounts/assets from backend API, value from CalculatePortfolioValue
- Auth: login/register pages, auth-context, protected routes, auto-refresh on 401
- Pages: Dashboard (`/`), Portfolios (`/portfolios`, `/portfolios/[id]`), Accounts, Assets
- Sidebar with active link highlighting

## Technology Stack

- **Framework**: Next.js 15 (App Router), TypeScript
- **Styling**: Tailwind CSS + shadcn/ui (zinc theme)
- **State**: TanStack Query v5 (server), React state (local)
- **API**: Connect-RPC via fetch (POST to `/eye.v1.*` endpoints)
- **Auth**: psina service via Traefik forwardAuth (X-User-Id header)

## Dev Workflow

```bash
# Local dev (direct backend access, mock user):
npm run dev           # → http://localhost:3000

# Docker (via Traefik, real auth):
cd deploy && docker compose up
# → https://eye-dev.darkfox.info/app
```

## Key Files

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Header + Sidebar
│   │   ├── page.tsx            # Dashboard
│   │   ├── portfolios/         # List + [id] detail
│   │   ├── accounts/
│   │   └── assets/
│   ├── login/ register/        # Auth pages
│   └── providers.tsx           # QueryClient + ThemeProvider
├── components/portfolio/       # Summary card, holdings table, allocation bars
├── hooks/
│   ├── use-portfolio.ts        # Dashboard data (backend/coingecko/mock)
│   ├── use-portfolios.ts       # CRUD hooks
│   ├── use-holdings.ts
│   ├── use-accounts.ts
│   └── use-assets.ts
└── lib/
    ├── api/
    │   ├── client.ts           # ApiClient (relative URLs, 401→refresh→retry)
    │   ├── portfolio-api.ts    # Connect-RPC calls
    │   ├── assets-api.ts
    │   ├── adapters.ts         # Backend → RawHolding conversion
    │   └── backend-types.ts    # TypeScript types for backend responses
    ├── auth/
    │   ├── api.ts              # login/logout/checkAuth/refreshToken
    │   └── auth-context.tsx    # useAuth() hook
    └── mocks/                  # Fallback mock data + CoinGecko fetcher
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

1. `USE_BACKEND=true` → listHoldings (all portfolios) + listAccounts + listAssets
   → CoinGecko prices → calculatePortfolio() + backend CalculatePortfolioValue
2. `USE_LIVE_PRICES=true` → mock holdings + CoinGecko prices
3. fallback → mock holdings + mock prices

## Add shadcn Component

```bash
npx shadcn@latest add [component-name]
```
