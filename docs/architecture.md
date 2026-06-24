# Greedy Eye Frontend - Architecture Documentation

## Overview

Dashboard frontend for Greedy Eye portfolio management platform, built with Next.js and React.

Based on arc42 template, adapted for frontend architecture.

---

## 1. Introduction and Goals

### 1.1 Requirements

**Functional Requirements:**
- Display portfolio list with summary values
- Show portfolio details with holdings breakdown
- Real-time price updates for assets
- Create, edit, delete portfolios and holdings
- Asset allocation visualization (charts)
- Rule management for automation

**Non-functional Requirements:**
- Time to Interactive < 2s
- First Contentful Paint < 1.5s
- Support modern browsers (Chrome, Firefox, Safari, Edge)
- Desktop-first design (1920x1080 primary)
- Dark theme by default

### 1.2 Quality Goals

| Priority | Goal | Metric |
|----------|------|--------|
| 1 | Performance | LCP < 2s, bundle < 500KB gzipped |
| 2 | Usability | Intuitive navigation, minimal clicks |
| 3 | Maintainability | Component reuse, clear structure |

### 1.3 Stakeholders

| Role | Expectations |
|------|--------------|
| User | Fast, responsive dashboard for portfolio tracking |
| Developer | Clear architecture, easy to extend |

---

## 2. Constraints

### 2.1 Technical Constraints

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS (no CSS-in-JS)
- **Components**: shadcn/ui (copy-paste, not npm package)
- **State**: TanStack Query for server state
- **Backend**: Connect-RPC on :8080 (POST `/eye.v1.*`); auth via psina forwardAuth

### 2.2 Conventions

- English only in code and documentation
- Functional components (no class components)
- Server Components by default
- File naming: kebab-case
- Component naming: PascalCase

---

## 3. Context and Scope

### 3.1 Context Diagram (C1)

```
┌─────────────────────────────────────────────────────────┐
│                      User (Browser)                      │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Greedy Eye Frontend                     │
│                    (Next.js App)                         │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP/JSON
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Greedy Eye Backend                      │
│               (Go + Connect-RPC :8080)                   │
└─────────────────────────────────────────────────────────┘
```

In Docker, requests pass through Traefik, which calls psina `/verify`
(forwardAuth) and injects `X-User-Id` before reaching frontend/backend.

### 3.2 Technical Context

| Interface | Protocol | Format |
|-----------|----------|--------|
| User ↔ Frontend | HTTPS | HTML/JS |
| Frontend ↔ Backend | HTTP (h2c) | JSON (Connect-RPC) |
| Frontend ↔ psina | HTTP | JSON (`/auth.v1.*`) |

---

## 4. Solution Strategy

### 4.1 Key Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js App Router | Server Components, built-in routing, SSR |
| shadcn/ui | Full ownership, no vendor lock-in, Radix a11y |
| TanStack Query | Superior caching, DevTools, polling support |
| Polling (not WebSocket) | Backend doesn't support WS yet, simpler |
| Desktop-first | Portfolio management is desktop activity |

### 4.2 Patterns

- **Container/Presentational**: Pages fetch, components display
- **Custom Hooks**: Encapsulate data fetching logic
- **Query Key Factory**: Centralized, hierarchical keys
- **Optimistic Updates**: Immediate UI feedback on mutations

---

## 5. Building Block View

### 5.1 Container Diagram (C2)

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Next.js App                           │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │ │
│  │  │   App Router │  │  Components  │  │  TanStack     │  │ │
│  │  │   (Pages)    │  │  (UI + Biz)  │  │  Query Cache  │  │ │
│  │  └──────────────┘  └──────────────┘  └───────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │              API Client (lib/api)                 │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP :8080
┌──────────────────────────────────────────────────────────────┐
│                    Backend API (Go)                           │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Component Diagram (C3)

```
src/
├── app/
│   ├── layout.tsx              # Root: fonts, metadata, providers
│   ├── providers.tsx           # QueryClient + Theme + Auth
│   ├── login/ register/        # Auth pages
│   └── (dashboard)/            # Protected route group
│       ├── layout.tsx          # Header + Sidebar (NAV_LINKS)
│       ├── page.tsx            # Macro dashboard (world finance)
│       ├── portfolios/         # aggregate + [id] Overview/Holdings/Settings
│       ├── rules/              # automation rules + manual actions
│       ├── prices/             # asset prices + history
│       ├── settings/           # PAT management + accounts
│       └── assets/             # asset catalog
│
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── portfolio/              # summary, holdings table, allocation bars/chart/targets
│   ├── macro/                  # dashboard widgets
│   ├── rules/                  # rules view + actions
│   └── prices/                 # price table + chart
│
├── hooks/                      # use-portfolio, use-rules, use-pats, use-prices, …
│
└── lib/
    ├── api/                    # client.ts + portfolio/automation/assets-api + adapters
    ├── auth/                   # api.ts, pat-api.ts, auth-context.tsx
    ├── portfolio-scope.tsx     # scopes usePortfolio to one portfolio
    ├── types/api.ts            # generated from backend OpenAPI
    ├── config/                 # query-client, dashboard-widgets
    └── mocks/                  # fallback data + CoinGecko + macro
```

### 5.3 Data Flow

```
Component
    │
    ▼ uses
Custom Hook (usePortfolios)
    │
    ▼ calls
Service (portfolioService.list)
    │
    ▼ uses
API Client (apiClient.get)
    │
    ▼ HTTP
Backend API
```

---

## 6. Runtime View

### 6.1 Portfolio List Flow

```
1. User navigates to /portfolios
2. Page component renders
3. usePortfolios() hook called
4. TanStack Query checks cache
   - Cache hit: return cached data
   - Cache miss: fetch from API
5. Loading skeleton shown during fetch
6. Data received → render portfolio cards
7. Background refetch on window focus
```

### 6.2 Create Portfolio Flow

```
1. User clicks "New Portfolio"
2. Dialog opens with form
3. User fills name, description
4. Form validates with Zod
5. useCreatePortfolio().mutate() called
6. Optimistic update: add to cache
7. API request sent
8. Success: invalidate queries, close dialog
9. Error: rollback optimistic update, show toast
```

---

## 7. Deployment View

### 7.1 Development

```
localhost:3000 (Next.js dev server)
       │
       ▼ proxy/direct
localhost:8080 (Backend API)
```

### 7.2 Docker (Traefik + psina)

```
Browser ──HTTPS──► Traefik ──forwardAuth──► psina /verify
                      │  (200 + X-User-Id)
                      ├──► eye-fe (Next.js)
                      └──► eye    (Connect-RPC backend, h2c)
```

All services share an external `proxy` Docker network. Each repo ships its own
`deploy/compose.yaml` and `make up`. See [development.md](development.md) for the
bring-up order and a full-stack example.

---

## 8. Crosscutting Concepts

### 8.1 State Management

| State Type | Solution |
|------------|----------|
| Server state | TanStack Query |
| Form state | React Hook Form |
| UI state | React useState/useReducer |
| URL state | Next.js searchParams |

### 8.2 Error Handling

- API errors: Custom `ApiError` class with status codes
- Component errors: Error boundaries (future)
- Form errors: Zod validation messages
- Network errors: Retry with exponential backoff

### 8.3 Caching Strategy

| Data | Stale Time | GC Time | Polling |
|------|------------|---------|---------|
| Portfolio list | 30s | 5min | No |
| Portfolio value | 30s | 5min | 60s |
| Latest prices | 30s | 5min | 60s |
| Asset catalog | 1h | 2h | No |

### 8.4 Security

Authentication is delegated to **psina** (separate service).

- **Local dev**: `NEXT_PUBLIC_MOCK_USER_ID` injects `X-User-Id` directly — no psina needed.
- **Docker**: Traefik forwardAuth calls psina `/verify`, which validates the
  session (HttpOnly `psina_access`/`psina_refresh` cookies) and injects
  `X-User-Id`. The client auto-refreshes via `/auth.v1.AuthService/Refresh` on 401.
- **External clients / MCP**: psina personal access tokens (`psn_…`), sent as
  `Authorization: Bearer`. Minted/revoked at `/settings`.

---

## 9. Architecture Decisions (ADRs)

All Accepted unless noted. Each lists the decision and its main trade-off.

| # | Decision | Why / trade-off |
|---|----------|-----------------|
| 1 | **Next.js 16 App Router** | Server Components, built-in routing/SSR; Server-vs-Client learning curve |
| 2 | **shadcn/ui** (copy-paste, Radix) | Full ownership, a11y, no lock-in; manual updates |
| 3 | **TanStack Query v5** | Caching, devtools, polling; extra dependency |
| 4 | **Connect-RPC over fetch** | POST `/eye.v1.*` JSON to the Go backend; no generated client, hand-written `lib/api/*-api.ts` |
| 5 | **Auth via psina** | forwardAuth (`X-User-Id`) in Docker, mock id locally, PAT (`psn_`) for external/MCP; FE owns no user store |
| 6 | **OpenAPI type generation** | Types in `lib/types/api.ts` generated from backend spec; regenerate on contract change |
| 7 | **Polling, not WebSocket** | 60s price refresh; simple, no backend WS; more requests |
| 8 | **UI-first with mock data** | `lib/mocks/` lets the UI run without a backend; `NEXT_PUBLIC_USE_BACKEND` toggles real data |
| 9 | **CoinGecko direct fetch** (temporary) | Live prices client-side until the backend price scheduler lands |
| 10 | **Theme via CSS variables** | `next-themes` + Tailwind tokens; green/red status colors |
| 11 | **Bar charts over pie** | Allocation bars read better for target-vs-current; pie kept for overview |
| 12 | **Desktop-first** | Portfolio management is a desktop activity; mobile less optimal |

---

## 10. Quality Requirements

### 10.1 Performance

| Metric | Target |
|--------|--------|
| Largest Contentful Paint | < 2s |
| First Input Delay | < 100ms |
| Cumulative Layout Shift | < 0.1 |
| Bundle size (gzipped) | < 500KB |

### 10.2 Accessibility

- Keyboard navigation (via Radix)
- ARIA labels on interactive elements
- Color contrast (WCAG AA)
- Focus indicators

---

## 11. Risks and Technical Debt

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Backend API changes | Medium | High | Generated types, versioned API |
| Bundle size growth | Medium | Medium | Code splitting, lazy loading |
| Stale cache issues | Low | Medium | Proper invalidation, short stale time |

### Technical Debt

1. **No E2E tests** - Manual testing only
2. **No error boundaries** - Errors crash components
3. **No i18n setup** - English only
4. **Client-side prices** - CoinGecko fetched in the browser until a backend price scheduler exists
5. **Backend vs client totals** - backend stores prices for a subset of assets; the UI shows the fuller client-side total

---

## 12. Glossary

| Term | Definition |
|------|------------|
| Server Component | React component rendered on server (no client JS) |
| Client Component | React component with 'use client', runs in browser |
| Query Key | Unique identifier for TanStack Query cache entry |
| Optimistic Update | Update UI before server confirms |
| Stale Time | How long data is considered fresh |

---

**Document Version**: 2.0  
**Last Updated**: 2026-06  
**Status**: Active
