# Architecture Decisions Record (ADR)

Detailed log of architectural decisions for Greedy Eye Frontend.

---

## ADR-001: Next.js App Router

**Date**: 2026-01-01  
**Status**: Accepted

### Context
Need to choose between Next.js App Router (new) and Pages Router (legacy).

### Decision
Use Next.js 15 App Router.

### Rationale
- Server Components for better performance
- Built-in loading/error states via file conventions
- File-based routing with layouts
- Modern approach, recommended by Next.js team
- Better data fetching patterns

### Consequences
- ✅ Better performance (reduced client JS)
- ✅ Simpler data fetching with async components
- ✅ Nested layouts out of the box
- ❌ Learning curve (Server vs Client components)
- ❌ Some libraries not yet compatible

---

## ADR-002: shadcn/ui Component Library

**Date**: 2026-01-01  
**Status**: Accepted

### Context
Need accessible, customizable UI components. Options: Material-UI, Chakra UI, shadcn/ui, Radix primitives.

### Decision
Use shadcn/ui (copy-paste components built on Radix UI).

### Rationale
- Full ownership of component code
- No vendor lock-in (not an npm dependency)
- Built on Radix UI (accessibility out of the box)
- Easy to customize (just edit the file)
- Tailwind CSS integration

### Consequences
- ✅ Complete control over code
- ✅ No dependency version conflicts
- ✅ Excellent accessibility via Radix
- ❌ Manual updates when shadcn releases improvements
- ❌ Need to copy each component individually

---

## ADR-003: TanStack Query for Server State

**Date**: 2026-01-01  
**Status**: Accepted

### Context
Need solution for data fetching, caching, and synchronization. Options: SWR, TanStack Query, Redux Toolkit Query.

### Decision
Use TanStack Query v5.

### Rationale
- More powerful API than SWR (infinite queries, prefetching)
- Excellent DevTools for debugging
- Built-in polling support
- Active development and community
- Query invalidation and optimistic updates

### Consequences
- ✅ Rich feature set
- ✅ Excellent caching with fine-grained control
- ✅ DevTools for debugging queries
- ❌ Slightly larger bundle than SWR
- ❌ More concepts to learn

---

## ADR-004: Polling for Real-Time Updates

**Date**: 2026-01-01  
**Status**: Accepted

### Context
Need real-time price updates. Options: WebSocket, Server-Sent Events, Polling.

### Decision
Use polling with 60-second interval via TanStack Query `refetchInterval`.

### Rationale
- Backend WebSocket not implemented yet
- TanStack Query natively supports polling
- Simpler to implement and debug
- Sufficient for MVP (prices don't change every second)
- Easy to migrate to WebSocket later

### Consequences
- ✅ Simple implementation
- ✅ No backend changes required
- ✅ Works with existing REST API
- ❌ More HTTP requests than WebSocket
- ❌ Up to 60s delay for price updates
- ➡️ Can migrate to WebSocket when backend supports it

---

## ADR-005: OpenAPI Type Generation

**Date**: 2026-01-01  
**Status**: Accepted

### Context
Need type-safe API integration. Options: Manual types, generated types, GraphQL codegen.

### Decision
Auto-generate TypeScript types from backend OpenAPI spec using `openapi-typescript`.

### Rationale
- Single source of truth (backend defines API)
- Automatic sync with backend changes
- Compile-time type safety
- Reduces manual type maintenance

### Consequences
- ✅ Always in sync with backend
- ✅ Type-safe API calls
- ✅ IDE autocomplete for API responses
- ❌ Needs build step (regeneration)
- ❌ Backend uses Swagger 2.0, needs conversion first

### Implementation
```bash
npx swagger2openapi ../greedy-eye/docs/openapi.yaml -o src/lib/types/openapi-v3.yaml
npx openapi-typescript src/lib/types/openapi-v3.yaml -o src/lib/types/api.ts
```

---

## ADR-006: Desktop-First Design

**Date**: 2026-01-01  
**Status**: Accepted

### Context
Need to decide responsive design approach. Options: Mobile-first, Desktop-first, Responsive from start.

### Decision
Optimize for desktop (1920x1080), tablet and mobile as secondary.

### Rationale
- Portfolio management is primarily a desktop activity
- Complex data visualization needs screen space
- Target users (investors) typically use desktop
- Follows Binance/Bloomberg Terminal patterns

### Consequences
- ✅ Rich UI for desktop users
- ✅ Focus development on primary use case
- ✅ More space for charts and tables
- ❌ Mobile experience less optimal
- ❌ May need separate mobile app later

---

## ADR-007: Bar Charts over Pie Charts

**Date**: 2026-01-06  
**Status**: Accepted

### Context
Need to visualize portfolio allocation. Initial implementation used pie chart.

### Decision
Replace pie chart with horizontal bar chart.

### Rationale
- Pie charts are bad for human perception (angle/area comparison is hard)
- Bar charts allow easy comparison of 30+ items
- Bar charts can show target markers (vertical line)
- Path to timeline visualization (stacked area chart)
- Research supports bars over pies for quantitative comparison

### Consequences
- ✅ Better readability for many assets
- ✅ Can show current vs target in same visual
- ✅ Scales to large portfolios
- ✅ Natural evolution to time-series charts
- ❌ Takes more vertical space

### Implementation
```typescript
// src/components/portfolio/allocation-bars.tsx
// Horizontal bars with:
// - Current allocation (bar width)
// - Target marker (vertical line)
// - Color coding: orange=overweight, blue=underweight
```

---

## ADR-008: UI-First Development with Mock Data

**Date**: 2026-01-06  
**Status**: Accepted

### Context
Backend adapters (CoinGecko, Moralis, Binance) are stubs. Need to develop UI without waiting.

### Decision
Build UI with mock data layer, then progressively connect to live APIs.

### Rationale
- Faster iteration on UX without backend dependencies
- Real data from R script provides realistic test cases
- Can validate UI before investing in backend work
- Graceful degradation pattern established

### Implementation Phases
```
Phase 1: Static mocks (from R script)        ✅ Done
Phase 2: CoinGecko direct (browser fetch)    ✅ Done
Phase 3: Backend PriceService                🔄 Planned
Phase 4: Full backend integration            📋 Future
```

### Consequences
- ✅ Fast UI development
- ✅ Realistic data for testing
- ✅ Graceful fallback when APIs fail
- ❌ Duplicate logic (frontend calculations)
- ➡️ Move calculations to backend when ready

---

## ADR-009: Theme System with CSS Variables

**Date**: 2026-01-06  
**Status**: Accepted

### Context
Need light/dark/system theme support.

### Decision
Use `next-themes` with CSS custom properties (variables).

### Rationale
- `next-themes` handles SSR hydration issues
- CSS variables allow theme switching without JS
- Semantic tokens (`--background`, `--foreground`) decouple from specific colors
- Consistent with shadcn/ui patterns

### Implementation
```css
/* globals.css */
:root { /* light theme */ }
.dark { /* dark theme */ }
```

```typescript
// providers.tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
```

### Consequences
- ✅ System preference detection
- ✅ No flash on page load
- ✅ Easy to add more themes
- ❌ Need to use semantic classes (`bg-background` not `bg-white`)

---

## ADR-010: CoinGecko Direct Fetch (Temporary)

**Date**: 2026-01-06  
**Status**: Accepted (Temporary)

### Context
Need live prices. Backend PriceService adapters are stubs.

### Decision
Fetch prices directly from CoinGecko in browser, with fallback to mock data.

### Rationale
- Unblocks UI development immediately
- Same API as R script (proven working)
- 60s cache respects rate limits
- Graceful fallback maintains UX

### Rate Limits
- Free tier: 10-30 calls/minute
- Mitigation: 60s staleTime, refetchInterval

### Migration Path
```
Now:     Browser → CoinGecko API
Future:  Browser → Backend → CoinGecko (cached)
```

### Consequences
- ✅ Live prices immediately
- ✅ No backend changes needed
- ❌ CORS dependency on CoinGecko
- ❌ Rate limits shared across all users
- ➡️ Move to backend when PriceService ready

---

## Technology Stack Summary

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 15 | SSR, App Router, best React framework |
| Language | TypeScript 5 | Type safety, IDE support |
| Styling | Tailwind CSS | Rapid development, tree-shaking |
| Components | shadcn/ui | Customizable, accessible |
| Server State | TanStack Query | Caching, polling, DevTools |
| Forms | React Hook Form + Zod | Performance, validation |
| Charts | Recharts | React-native, composable |
| Themes | next-themes | SSR-safe theme switching |

---

## Design Patterns

### Data Flow (Current)
```
Page (Dashboard)
    │ renders
Components (PortfolioSummaryCard, HoldingsTable)
    │ use
Custom Hooks (usePortfolio, useHoldings)
    │ use TanStack Query with
Mock Layer (fetchPricesWithFallback)
    │ fetches from
CoinGecko API (or fallback to mockPrices)
```

### Component Pattern
```
ui/           → Primitives (Button, Card, Input)
layout/       → App shell (Header, Sidebar) [currently inlined]
portfolio/    → Business components (SummaryCard, HoldingsTable, AllocationBars)
```

---

## Future Considerations

1. **Extract inlined components** - Move Header, Sidebar, ThemeToggle back to separate files
2. **Backend integration** - Connect to PriceService when adapters implemented
3. **WebSocket** - For real-time updates when backend supports it
4. **E2E Testing** - Playwright for critical flows
5. **Mobile optimization** - Responsive tables, touch-friendly controls

---

**Last Updated**: 2026-01-06
