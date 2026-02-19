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

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS (no CSS-in-JS)
- **Components**: shadcn/ui (copy-paste, not npm package)
- **State**: TanStack Query for server state
- **Backend**: REST API on http://localhost:8080

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
│              (Go + gRPC-Gateway :8080)                   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Technical Context

| Interface | Protocol | Format |
|-----------|----------|--------|
| User ↔ Frontend | HTTPS | HTML/JS |
| Frontend ↔ Backend | HTTP | JSON (REST) |

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
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root: fonts, metadata
│   ├── providers.tsx           # QueryClientProvider
│   ├── page.tsx                # Landing/redirect
│   └── (dashboard)/            # Route group
│       ├── layout.tsx          # Sidebar + Header
│       ├── dashboard/page.tsx  # Overview
│       ├── portfolios/         # Portfolio pages
│       ├── assets/             # Asset catalog
│       └── settings/           # User settings
│
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── layout/                 # App shell
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   └── portfolio/              # Feature components
│       ├── portfolio-card.tsx
│       ├── portfolio-list.tsx
│       └── portfolio-form.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts           # HTTP client + retry
│   │   ├── query-keys.ts       # Key factory
│   │   ├── services/           # API calls by domain
│   │   └── hooks/              # useQuery wrappers
│   ├── types/
│   │   └── api.ts              # Generated from OpenAPI
│   ├── utils/
│   │   └── currency.ts         # Amount formatting
│   └── config/
│       └── query-client.ts     # TanStack config
│
└── hooks/                      # Shared custom hooks
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
1. User navigates to /dashboard/portfolios
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

### 7.2 Production (Future)

```
CDN (Vercel/Cloudflare)
       │
       ▼
Next.js Server (SSR)
       │
       ▼
Backend API (container)
```

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

**Current (Development):**
- Mock authentication (hardcoded user ID)
- No real auth flow

**Future (Production):**
- JWT tokens from AuthService
- HttpOnly cookies
- CSRF protection

---

## 9. Architecture Decisions

### ADR-001: Next.js App Router

**Status**: Accepted

**Context**: Choose between App Router and Pages Router

**Decision**: Use App Router (Next.js 15)

**Consequences**:
- ✅ Server Components for performance
- ✅ Built-in loading/error states
- ✅ Modern approach, recommended by Next.js
- ❌ Learning curve (Server vs Client)

### ADR-002: shadcn/ui

**Status**: Accepted

**Context**: Choose component library

**Decision**: Use shadcn/ui (copy-paste components)

**Consequences**:
- ✅ Full code ownership
- ✅ No vendor lock-in
- ✅ Built on Radix UI (accessibility)
- ❌ Manual updates required

### ADR-003: TanStack Query

**Status**: Accepted

**Context**: Choose data fetching solution

**Decision**: Use TanStack Query v5

**Consequences**:
- ✅ Powerful caching and sync
- ✅ Excellent DevTools
- ✅ Built-in polling support
- ❌ Additional dependency

### ADR-004: Polling over WebSocket

**Status**: Accepted

**Context**: Real-time price updates

**Decision**: Use polling (60s interval)

**Consequences**:
- ✅ Simple implementation
- ✅ No backend changes needed
- ❌ More requests than WebSocket
- ➡️ Can migrate to WebSocket later

### ADR-005: Desktop-First Design

**Status**: Accepted

**Context**: Responsive design approach

**Decision**: Optimize for desktop (1920x1080)

**Consequences**:
- ✅ Rich UI for primary use case
- ✅ Focus development effort
- ❌ Mobile experience less optimal

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

1. **No real authentication** - Using mock user
2. **No E2E tests** - Manual testing only
3. **No error boundaries** - Errors crash components
4. **No i18n setup** - English only

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

**Document Version**: 1.0  
**Last Updated**: 2026-01-02  
**Status**: Active
