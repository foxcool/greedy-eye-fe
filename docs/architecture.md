# Greedy Eye Frontend — Architecture Documentation

## Overview

Dashboard frontend for the Greedy Eye portfolio platform: Next.js App Router on top
of the Go backend's Connect-RPC API.

Based on arc42, adapted for a frontend.

> **Source of truth**: the code. This document is hand-maintained prose about
> `src/` — when they disagree, the code wins. The backend contract lives in
> `greedy-eye/api/v1/*.proto`; this repo mirrors it by hand in
> `src/lib/api/backend-types.ts` (see ADR-6).

---

## 1. Introduction and Goals

### 1.1 Requirements

**Functional:**
- Show every position the user owns, in one currency, across portfolios and accounts
- Portfolio detail: value, allocation, holdings, target allocations, settings
- Asset catalog with the scam-filter verdict and a quarantine section
- Account management: wallets, exchanges, manual accounts, provider credentials
- Automation rules: list, lifecycle, manual portfolio actions
- Prices and price history
- Personal access tokens for external clients (MCP)

**Non-functional:**
- Desktop-first (1920×1080 primary); usable on a laptop screen
- Two visual styles × light/dark, switchable at runtime
- Runs without a backend at all (demo mode) for UI work and previews
- Modern evergreen browsers only

### 1.2 Quality Goals

| Priority | Goal | How it is judged |
|----------|------|------------------|
| 1 | **Honesty of numbers** | The UI never presents a value more confidently than the backend does. Mock data never renders outside demo mode; excluded and unvalued positions must stay visible |
| 2 | Usability | Few clicks to the number that matters; the sum is reachable from the first screen |
| 3 | Performance | Fast first paint on a dashboard-sized payload |
| 4 | Maintainability | Component reuse, one API layer, no hidden data sources |

Goal 1 is not decoration. The backend can return a portfolio value that omits
positions it could not price (`ValuationCoverage`) and holdings excluded by the
scam filter. A frontend that renders only the headline number turns a partial
answer into a confident lie.

### 1.3 Stakeholders

| Role | Expectations |
|------|--------------|
| User (single, self-hosted) | Fast, truthful dashboard for portfolio tracking |
| Developer (one) | Clear structure, no codegen surprises, easy to extend |

---

## 2. Constraints

### 2.1 Technical Constraints

- **Framework**: Next.js 16, App Router, `output: "standalone"`, `basePath: "/app"`
- **Runtime**: React 19; Node 20.9+ locally, CI builds on Node 22
- **Language**: TypeScript 5 (strict)
- **Styling**: Tailwind CSS v4 + CSS variables (no CSS-in-JS)
- **Components**: shadcn/ui (copy-paste into `components/ui/`, not an npm dependency)
- **Server state**: TanStack Query v5
- **Backend**: Connect-RPC on the Go service — `POST /eye.v1.<Service>/<Method>`, JSON
- **Auth**: psina, cookie flow behind Traefik `forwardAuth`; no user store here

### 2.2 Conventions

- English only in code, comments and docs
- Functional components; `'use client'` where interactivity or hooks are needed
- File naming kebab-case, components PascalCase
- Money from the backend arrives as integer + `decimals` — convert once, in the API layer

---

## 3. Context and Scope

### 3.1 Context Diagram (C1)

```
                    ┌──────────────────┐
                    │  User (Browser)  │
                    └────────┬─────────┘
                             │ HTTPS
                    ┌────────▼─────────┐
                    │     Traefik      │──forwardAuth──► psina /verify
                    └────┬────────┬────┘   (200 + X-User-Id, X-User-Roles)
              /app, /_next│        │/eye.v1.*, /auth.v1.*
                    ┌─────▼────┐ ┌─▼──────────────────┐
                    │  eye-fe  │ │ eye (Connect-RPC)  │
                    │ Next.js  │ │ Go, h2c :8080      │
                    └──────────┘ └────────────────────┘
```

The browser talks to the backend **directly** (relative URLs through the same
Traefik host), not through a Next.js API route. There is no BFF layer: pages and
client components call the backend from the browser with `credentials: 'include'`.

### 3.2 Technical Context

| Interface | Protocol | Format |
|-----------|----------|--------|
| User ↔ Frontend | HTTPS | HTML/JS |
| Frontend ↔ Backend | HTTPS (h2c behind Traefik) | JSON over Connect-RPC, `POST /eye.v1.*` |
| Frontend ↔ psina | HTTPS | JSON, `POST /auth.v1.AuthService/*` |

---

## 4. Solution Strategy

### 4.1 Key Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js App Router | Routing, layouts, standalone build; most pages are client components because the data is user-scoped and cookie-authenticated |
| shadcn/ui | Full ownership of the primitives, Radix a11y, no vendor lock-in |
| TanStack Query | Caching, invalidation, devtools; one place for retry/refetch policy |
| Hand-written API layer | Connect-RPC over `fetch`; no generated client (ADR-4, ADR-6) |
| Backend owns prices | The browser never calls a price provider (ADR-7) |
| Explicit demo mode | Mock data is a *mode*, not a fallback (ADR-8) |
| Desktop-first | Portfolio management is a desktop activity |

### 4.2 Patterns

- **Hook per resource** — `use-portfolios`, `use-holdings`, `use-heatmap`… encapsulate
  query keys, fetching and the demo/backend switch
- **API module per backend service** — `portfolio-api`, `assets-api`, `automation-api`,
  `analytics-api`, all on one `apiClient`
- **Scope by context, not props** — `PortfolioScopeProvider` narrows the shared portfolio
  components to one portfolio without prop-drilling
- **Adapters at the edge** — `lib/api/adapters.ts` converts backend entities into the
  view model the presentational components already speak

---

## 5. Building Block View

### 5.1 Container Diagram (C2)

```
┌───────────────────────────── Browser ──────────────────────────────┐
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │  App Router  │  │  Components   │  │  TanStack Query cache    │ │
│  │  (pages)     │  │  (ui + domain)│  │  + MutationCache toasts  │ │
│  └──────┬───────┘  └───────┬───────┘  └────────────┬─────────────┘ │
│         └──────────────────┴────────────┬──────────┘               │
│                          ┌──────────────▼──────────────┐           │
│                          │   lib/api (apiClient + …)   │           │
│                          └──────────────┬──────────────┘           │
└─────────────────────────────────────────┼──────────────────────────┘
                                          ▼ POST /eye.v1.*
                                   Backend (Go, Connect-RPC)
```

### 5.2 Component Diagram (C3)

```
src/
├── app/
│   ├── layout.tsx              # Root: fonts, pre-paint style script, metadata
│   ├── providers.tsx           # Theme + QueryClient + Auth + devtools
│   ├── globals.css tokens.css  # Tailwind layer + design tokens (4 themes)
│   ├── login/                  # Sign-in (psina cookie flow)
│   └── (dashboard)/            # Protected group; layout owns header + sidebar
│       ├── page.tsx            # Macro dashboard (rates, markets, crypto, news)
│       ├── portfolios/         # list + [id] Overview / Holdings / Settings / targets
│       ├── accounts/           # accounts + provider credentials form
│       ├── assets/             # catalog, verdict badges, quarantine section
│       ├── prices/             # price table + history chart
│       ├── rules/              # automation rules + manual actions
│       └── settings/           # PAT management, appearance
│
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── heatmap/                # heatmap, heatmap-card, balance-heatmap
│   ├── portfolio/              # value header, holdings table, allocation bars/chart/targets
│   ├── macro/                  # dashboard widgets + widget-card
│   ├── prices/  rules/         # feature views
│   ├── brand/                  # greedy-eye-logo (state: idle | wander)
│   ├── style-provider.tsx      # ledger ↔ observatory axis
│   └── theme-toggle.tsx        # light ↔ dark axis
│
├── hooks/                      # use-portfolios, use-portfolio, use-holdings,
│                               # use-accounts, use-assets, use-heatmap, use-prices,
│                               # use-price-history, use-rules, use-pats, use-macro
│
└── lib/
    ├── api/                    # client.ts, portfolio-api, assets-api, automation-api,
    │                           # analytics-api, backend-types, adapters, price-map
    ├── auth/                   # api.ts (psina), auth-context, protected-route, pat-api
    ├── config/                 # query-client, data-source, dashboard-widgets
    ├── mocks/                  # demo-mode data only
    ├── portfolio-scope.tsx     # scope context for shared portfolio components
    ├── types/portfolio-view.ts # view model
    └── utils.ts
```

### 5.3 Data Flow

```
Page (client component)
    │ uses
Hook (usePortfolio)            ── reads USE_BACKEND / DEMO_MODE
    │ calls
API module (portfolioApi.calculatePortfolioValue)
    │ uses
apiClient.post('/eye.v1.PortfolioService/CalculatePortfolioValue')
    │ HTTPS (cookies)
Traefik → forwardAuth (psina) → Backend
```

---

## 6. Runtime View

### 6.1 Portfolio page

```
1. /portfolios/[id] renders, PortfolioScopeProvider pins the id
2. usePortfolio() → holdings + accounts + assets, adapters build the view model
3. useHeatmap(portfolioId) → GetHeatmap (flat, 24h) drives both the map and prices
4. Loading: skeletons; error: toast + empty state, never a fabricated number
5. Refetch on window focus and reconnect; no polling interval
```

### 6.2 Prices without a price provider

The backend has no batch "latest prices" RPC. `lib/api/price-map.ts` derives a
price map from `GetHeatmap(flat, 24h)` — one call per portfolio — keyed by asset
UUID and by uppercase symbol. Per-portfolio failures degrade to a partial map
instead of throwing. Catalog assets that nobody holds have no price until a batch
price RPC exists.

### 6.3 Auth and session

```
1. Any RPC → 401 (first attempt only)
2. apiClient calls refreshToken() → POST /auth.v1.AuthService/Refresh
3. Refresh ok  → the original request is retried once
   Refresh fails → redirectToLogin() via the registered Next.js router handler,
   so basePath is respected, and the error is rethrown
```

`refreshToken()` is **single-flight**: parallel callers await one shared promise.
This is not an optimisation. Psina rotates refresh tokens — a successful Refresh
revokes the presented one, and replaying a revoked token trips reuse detection,
which kills the whole token family and logs the user out. On load, the auth check
and every data request can hit 401 at once; without coalescing, the first would
rotate the cookie and the rest would replay a dead token.

Locally, `NEXT_PUBLIC_MOCK_USER_ID` injects `X-User-Id` and short-circuits
`checkAuth()`, so psina is not needed for UI work.

### 6.4 Mutation

```
1. User submits a form (React Hook Form + Zod)
2. useMutation → API module → backend
3. Success: invalidate the affected query keys
4. Failure: MutationCache.onError → toast. A silent failed mutation reads as a
   dead button, which is how a rejected account deletion once presented
```

---

## 7. Deployment View

### 7.1 Development

```
localhost:3000 (next dev)  ──►  localhost:8080 (backend)
NEXT_PUBLIC_MOCK_USER_ID   ──►  X-User-Id header, no psina needed
```

Or fully offline: `NEXT_PUBLIC_USE_BACKEND=false` → demo mode, no backend at all.

### 7.2 Docker (Traefik + psina)

```
Browser ──HTTPS──► Traefik ──forwardAuth──► psina /verify
                      │  (200 + X-User-Id, X-User-Email, X-User-Roles)
                      ├──► eye-fe  (Next.js, /app and /_next)
                      └──► eye     (Connect-RPC backend, h2c)
```

All services share the external `proxy` network; each repo ships its own
`deploy/compose.yaml` and `make up`. `NEXT_PUBLIC_*` values are **baked at build
time** — the production image is built with `NEXT_PUBLIC_USE_BACKEND=true`.
See [development.md](development.md) for the bring-up order.

---

## 8. Crosscutting Concepts

### 8.1 State Management

| State | Solution |
|-------|----------|
| Server state | TanStack Query |
| Form state | React Hook Form + Zod |
| UI state | `useState` / `useReducer` |
| Cross-cutting UI state | Context: auth, portfolio scope, UI style |
| URL state | App Router params and `searchParams` |
| Theme | `next-themes` (scheme) + `html[data-style]` (style axis) |

### 8.2 Data source modes

`lib/config/data-source.ts` exposes exactly two modes:

- `USE_BACKEND` (`NEXT_PUBLIC_USE_BACKEND=true`) — everything comes from the backend
- `DEMO_MODE` — no backend at all; the app is a self-contained demo on `lib/mocks/`

**Mock data must never render outside demo mode.** An empty state is honest, fake
numbers are not. Hooks gate their queries on `USE_BACKEND` and return mock data
only when `DEMO_MODE` is on.

### 8.3 Caching Strategy

Defaults (`lib/config/query-client.ts`): `staleTime` 30s, `gcTime` 5min, 3 retries
with exponential backoff (capped at 30s), refetch on window focus and on reconnect.

| Data | Stale time | Polling |
|------|-----------|---------|
| Portfolio value / holdings | 5 min | no |
| Prices, price history | 5 min | no |
| Heatmap (portfolio, balance) | 60 s | no |
| Macro widgets | 60 s | no |

There is **no polling interval anywhere**: prices are refreshed server-side by the
backend scheduler, and a focus-driven refetch is enough for a dashboard someone
looks at (ADR-7).

### 8.4 Theme model

Two independent axes:

- **Style** — `html[data-style="ledger" | "observatory"]`, persisted in
  `localStorage` under `ge-style`, applied by an inline script in the root layout
  **before first paint** (no flash). `style-provider.tsx` is a thin
  `useSyncExternalStore` wrapper: the DOM attribute is the source of truth
- **Scheme** — light/dark via `next-themes` (`.dark` class), default `system`

All four combinations are defined in `src/app/tokens.css`, which is the source of
truth for token values. `theme-color` meta is recomputed one frame after a change,
because `next-themes` applies its class in a parent effect.

The logo (`components/brand/greedy-eye-logo.tsx`) reads `useIsFetching` /
`useIsMutating` and wanders while anything is in flight — the app's only
global activity indicator.

### 8.5 Error Handling

- API errors: `ApiError` with status and parsed body
- Mutations: global `MutationCache.onError` → toast; a local `onError` may add to it
- Two retry layers, deliberately different: `apiClient` retries once, on 5xx and
  network failures only — **4xx never retries** — with a 1s–5s backoff and a
  10s per-request timeout; TanStack Query retries a *query* 3× on top of that
  (mutations once)
- Forms: Zod messages
- 401: single-flight refresh, then redirect (§6.3)
- Component-level error boundaries: **not implemented** (see §11)

### 8.6 Security

Authentication is delegated to **psina**; this app owns no user store and no tokens.

- **Local dev**: `NEXT_PUBLIC_MOCK_USER_ID` injects `X-User-Id` directly
- **Docker**: Traefik `forwardAuth` → psina `/verify` validates the HttpOnly
  `psina_access` / `psina_refresh` cookies and injects the identity headers
- **External clients / MCP**: psina personal access tokens (`psn_…`) as
  `Authorization: Bearer`, minted and revoked at `/settings`
- No token is ever placed in `localStorage`. If a Bearer flow is ever needed, it
  goes in memory behind a `NEXT_PUBLIC_AUTH_MODE` switch

---

## 9. Architecture Decisions (ADRs)

| # | Decision | Status | Why / trade-off |
|---|----------|--------|-----------------|
| 1 | **Next.js 16 App Router** | Accepted | Routing, layouts, standalone output; most pages end up client components because data is user-scoped and cookie-authenticated |
| 2 | **shadcn/ui** (copy-paste, Radix) | Accepted | Full ownership, a11y, no lock-in; manual updates |
| 3 | **TanStack Query v5** | Accepted | One place for caching, retries and invalidation; extra dependency |
| 4 | **Hand-written Connect-RPC client** | Accepted | `POST /eye.v1.*` JSON over `fetch`; no generated client, no `@connectrpc` runtime. Cheap for ~40 calls; must be kept in step with the proto by hand |
| 5 | **Auth via psina** | Accepted | forwardAuth in Docker, mock id locally, PAT for external/MCP; the FE owns no user store |
| 6 | **Backend types hand-maintained** | Accepted (supersedes "OpenAPI type generation") | The backend serves Connect-RPC and publishes **no OpenAPI spec**, so nothing can be generated from it. Types live in `src/lib/api/backend-types.ts` and mirror `api/v1/*.proto` by hand. `src/lib/types/api.ts` and `openapi-v3.yaml` are fossils of a dead REST API and are imported by nothing |
| 7 | **Backend owns prices** | Accepted (supersedes "CoinGecko direct fetch" and 60s polling) | The browser never calls a price provider. Prices come from stored backend data via `GetHeatmap`; refresh is the backend scheduler's job. Only a static symbol → CoinGecko-id map survives, for outbound info links |
| 8 | **Demo mode is a mode, not a fallback** | Accepted | `NEXT_PUBLIC_USE_BACKEND=false` runs the whole app on `lib/mocks/`. Mock data never leaks into a backend-connected session |
| 9 | **Heatmap is the allocation view** | Accepted (supersedes "bar charts over pie") | A treemap carries size and change at once; bars remain for target-vs-current, the donut is gone. Recharts, not nivo — it was already a dependency and the density nivo buys is only needed by a market-wide map |
| 10 | **Two-axis theme via CSS variables** | Accepted | style × scheme, tokens in `tokens.css`, pre-paint script kills the flash |
| 11 | **`basePath: /app`** | Accepted | One domain shared with the backend and auth behind Traefik; every redirect must go through the router, not `window.location`, to keep the prefix |
| 12 | **Desktop-first** | Accepted | Portfolio management is a desktop activity; small screens are usable, not optimal |

---

## 10. Quality Requirements

### 10.1 Performance

Targets, not measurements — no budget is enforced in CI yet.

| Metric | Target |
|--------|--------|
| Largest Contentful Paint | < 2s |
| Interaction to Next Paint | < 200ms |
| Cumulative Layout Shift | < 0.1 |

### 10.2 Accessibility

- Keyboard navigation via Radix primitives
- Visible focus rings (`focus-visible:ring-*`) on interactive elements
- Colour is never the only signal: verdicts and excluded state also carry text
- Contrast is a property of `tokens.css`; all four themes are meant to hold WCAG AA

---

## 11. Risks and Technical Debt

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Proto contract drifts from `backend-types.ts` | High | High | Types are hand-mirrored; a contract change must touch this repo in the same cycle |
| Bundle growth | Medium | Medium | Code splitting, no chart library beyond Recharts |
| Stale cache after a mutation | Low | Medium | Explicit invalidation per mutation |

### Technical Debt

1. **No tests at all** — no unit, component or E2E tests in this repo. The largest
   gap in the project's three repos
2. **`ValuationCoverage` is not consumed.** The backend reports which positions it
   could not price; the UI shows only the headline value. This contradicts quality
   goal 1 and is the highest-value debt item here
3. **`excludedCount` is not surfaced in the overview** — quarantined holdings are
   visible on the portfolio page, but the aggregate view does not say the sum
   excludes anything
4. **Dead code**: `src/lib/types/{api,enums,models}.ts`, `src/lib/types/openapi-v3.yaml`
   and `src/components/layout/{header,sidebar}.tsx` have zero importers
5. **No error boundaries** — a render error takes the subtree down
6. **No i18n** — English only
7. **Known UI bugs** (tracked in beads): the Sync button stays "Syncing…" until
   navigation; the holdings table hides the account column when there is a single
   source; layout breaks on small screens

---

## 12. Glossary

| Term | Definition |
|------|------------|
| Connect-RPC | Buf's protocol; the backend serves it as JSON over `POST /eye.v1.*` |
| Demo mode | `NEXT_PUBLIC_USE_BACKEND=false`: the app runs entirely on mock data |
| Heatmap node | `{id, label, parentId, size, colorValue, price, assetId}` from `GetHeatmap` |
| ValuationCoverage | Backend block listing which positions a portfolio value could not price |
| Quarantine | Assets the scam filter flagged; their holdings are excluded from totals |
| PAT | psina personal access token (`psn_…`) for external clients such as MCP |
| Style axis | `ledger` \| `observatory` — visual style, independent of light/dark |

---

**Document Version**: 3.0
**Last Updated**: 2026-08-01
**Status**: Active
