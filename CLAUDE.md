# Greedy Eye Frontend - Context for Claude

## Project Overview

Frontend for Greedy Eye portfolio management platform. Dashboard-style UI for tracking crypto, stocks, and other assets.

## Current State (2026-01-06)

**Status**: Portfolio Dashboard MVP working with live CoinGecko prices

### What's Implemented
- Portfolio summary card (total value, 24h change)
- Holdings table with expandable source breakdown
- Allocation bars (replaced pie chart) with target comparison
- Theme toggle (light/dark/system)
- Live prices from CoinGecko with mock fallback

### Data Flow
```
usePortfolio() hook
    ↓
fetchPricesWithFallback() → CoinGecko API (or mocks)
    ↓
calculatePortfolio() 
    ↓
UI Components
```

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS + shadcn/ui (zinc theme)
- **State**: TanStack Query v5 (server state), React state (local)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Themes**: next-themes

## Key Files

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx      # Header, Sidebar, ThemeToggle (inlined)
│   │   └── page.tsx        # Dashboard with portfolio components
│   ├── globals.css         # Theme CSS variables
│   ├── layout.tsx          # Root layout
│   └── providers.tsx       # TanStack Query + ThemeProvider
├── components/
│   ├── portfolio/
│   │   ├── portfolio-summary-card.tsx
│   │   ├── holdings-table.tsx
│   │   ├── allocation-bars.tsx
│   │   └── index.ts
│   └── theme-toggle.tsx
├── hooks/
│   └── use-portfolio.ts    # usePortfolio, useHoldings, etc.
└── lib/
    ├── mocks/
    │   ├── portfolio-data.ts   # Holdings from R script
    │   ├── portfolio-utils.ts  # Calculation logic
    │   └── coingecko.ts       # Live price fetching
    ├── api/client.ts          # HTTP client
    ├── config/query-client.ts
    └── types/
        ├── api.ts             # Generated from OpenAPI
        └── portfolio-view.ts  # UI-specific types
```

## Development

```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint check
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_LIVE_PRICES=true    # CoinGecko live prices
NEXT_PUBLIC_USE_BACKEND=false       # Backend API (future)
```

## Common Tasks

### Update Holdings Data
Edit `src/lib/mocks/portfolio-data.ts`:
- `rawHoldings` — token amounts by source
- `targetPercentages` — desired allocation %

### Regenerate Types from Backend
```bash
npx swagger2openapi ../greedy-eye/docs/openapi.yaml -o src/lib/types/openapi-v3.yaml
npx openapi-typescript src/lib/types/openapi-v3.yaml -o src/lib/types/api.ts
```

### Add shadcn Component
```bash
npx shadcn@latest add [component-name]
```

## Architecture Notes

1. **Layout components inlined** — Header, Sidebar, ThemeToggle are in layout.tsx (should extract later)
2. **No backend yet** — data from CoinGecko + mocks only
3. **Semantic CSS** — use `bg-card`, `text-foreground`, `border-border` for theme compatibility

## Next Steps

- [ ] Extract inlined components to separate files
- [ ] Manual holding form (add/edit CEX balances)
- [ ] Connect to backend PriceService
- [ ] E2E smoke tests

## Quick Reference

| Resource | Location |
|----------|----------|
| Dev server | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Session log | `docs/SESSION_LOG.md` |
| Architecture | `docs/ARCHITECTURE_DECISIONS.md` |
| Backend docs | `../greedy-eye/docs/architecture.md` |

## Known Issues

1. CoinGecko rate limits (10-30 calls/min free tier)
2. Some CSS variables may not resolve in Tailwind v4
3. Layout components should be extracted from layout.tsx
