<p align="center"><img src="docs/logo.svg" width="128" alt="Greedy Eye logo"></p>

# Greedy Eye Frontend

Dashboard frontend for Greedy Eye portfolio management platform.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Status](https://img.shields.io/badge/status-alpha-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, `basePath: /app`, standalone output)
- **Runtime**: React 19, TypeScript 5 (strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui, two styles × light/dark
- **State**: TanStack Query v5
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 20.9+ (CI builds on 22)
- A backend on http://localhost:8080 — or none at all, see demo mode below

### Installation

```bash
npm install
cp .env.example .env.local
```

### Development

```bash
npm run dev
# Open http://localhost:3000/app
```

Two ways to run:

| Mode | Env | What you get |
|------|-----|--------------|
| Backend | `NEXT_PUBLIC_USE_BACKEND=true` + `NEXT_PUBLIC_MOCK_USER_ID=<uuid>` | Real data, no psina needed locally |
| Demo | `NEXT_PUBLIC_USE_BACKEND=false` | Self-contained demo on mock data, no backend at all |

Mock data never renders in backend mode — an empty state is honest, fake numbers
are not.

### Backend types

Backend types live in `src/lib/api/backend-types.ts`, hand-maintained to match
the backend `api/v1/*.proto` files (the source of truth). The backend serves
Connect-RPC, which the OpenAPI generator does not cover, so there is **no
OpenAPI spec to generate from** — mirror proto changes into `backend-types.ts`
by hand.

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # Protected routes: portfolios, accounts, assets,
│   │                       # prices, rules, settings, macro dashboard
│   ├── login/              # psina cookie sign-in
│   ├── layout.tsx          # Root layout + pre-paint theme script
│   ├── providers.tsx       # Theme + QueryClient + Auth
│   └── tokens.css          # Design tokens: 2 styles × light/dark
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── heatmap/            # portfolio + balance treemaps
│   ├── portfolio/ macro/ prices/ rules/
│   └── brand/              # logo (wanders while requests are in flight)
├── lib/
│   ├── api/                # Connect-RPC client, per-service modules, adapters
│   ├── auth/               # psina cookie flow, PATs, protected route
│   ├── config/             # query client, data-source mode, widgets
│   └── mocks/              # demo-mode data only
└── hooks/                  # one hook per resource
```

## Documentation

- **[Architecture](docs/architecture.md)** — system design + ADRs (arc42)
- **[Development](docs/development.md)** — local dev, Docker/Traefik stack, MCP

## Features

- **Dashboard** (`/`) — macro overview widgets (rates, markets, crypto, news)
- **Portfolios** (`/portfolios`, `/portfolios/[id]`) — balance heatmap across all
  portfolios; per-portfolio Overview / Holdings / Settings with editable target
  allocations and a performance treemap instead of a donut
- **Accounts** (`/accounts`) — wallets, exchanges, manual accounts, provider
  credentials (write-only secrets, admin-only system scopes), Sync
- **Assets** (`/assets`) — catalog with scam-filter verdict badges and a
  quarantine section for flagged assets
- **Prices** (`/prices`) — asset prices and history charts
- **Rules** (`/rules`) — automation rules + manual portfolio actions
- **Settings** (`/settings`) — personal access tokens (for MCP), appearance

Prices come from the backend only; the browser never calls a price provider.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # tsc --noEmit
npm run check        # typecheck + lint + build (what CI runs)
```

There are no tests in this repo yet.

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080  # "" behind Traefik (relative URLs)
NEXT_PUBLIC_USE_BACKEND=true               # false → demo mode on mock data
NEXT_PUBLIC_MOCK_USER_ID=<uuid>            # local only: injects X-User-Id, skips psina
```

`NEXT_PUBLIC_*` values are baked at **build** time — the production image is built
with `NEXT_PUBLIC_USE_BACKEND=true`.

## Run the full stack (example)

The frontend, backend (`greedy-eye`), and auth (`psina`) normally run as separate
services on a shared Traefik `proxy` network — see
[docs/development.md](docs/development.md) for the real per-repo flow with `make`.

The compose below is an **illustrative example** for quickly trying the whole stack
on one machine. Replace `${EYE_DOMAIN}` and images with your own, and provide a
Traefik with a TLS resolver.

```yaml
# docker-compose.example.yaml — illustrative, not a canonical deploy
networks:
  proxy:
    external: true

services:
  psina:
    image: ghcr.io/your-org/psina:latest
    environment:
      PSINA_DB_URL: postgres://psina:password@psina-db:5432/psina?sslmode=disable
      PSINA_COOKIE_ENABLED: "true"
    networks: [proxy, default]
    labels:
      - traefik.enable=true
      - traefik.http.routers.psina.rule=Host(`${EYE_DOMAIN}`) && PathPrefix(`/auth.v1.`)
      - traefik.http.services.psina.loadbalancer.server.scheme=h2c
      # forwardAuth used by the backend router below:
      - traefik.http.middlewares.psina-auth.forwardAuth.address=http://psina:8080/verify
      - traefik.http.middlewares.psina-auth.forwardAuth.authResponseHeaders=X-User-Id,X-User-Email

  eye:
    image: ghcr.io/your-org/greedy-eye:latest
    networks: [proxy, default]
    labels:
      - traefik.enable=true
      - traefik.http.routers.eye.rule=Host(`${EYE_DOMAIN}`) && PathPrefix(`/eye.v1.`)
      - traefik.http.routers.eye.middlewares=psina-auth@docker
      - traefik.http.services.eye.loadbalancer.server.scheme=h2c

  eye-fe:
    image: ghcr.io/your-org/greedy-eye-fe:latest
    environment:
      NEXT_PUBLIC_API_URL: ""          # relative URLs via Traefik
      NEXT_PUBLIC_USE_BACKEND: "true"
    networks: [proxy, default]
    labels:
      - traefik.enable=true
      - traefik.http.routers.eye-fe.rule=Host(`${EYE_DOMAIN}`) && (PathPrefix(`/app`) || PathPrefix(`/_next`))

  psina-db:
    image: postgres:17-alpine
    environment: { POSTGRES_USER: psina, POSTGRES_PASSWORD: password, POSTGRES_DB: psina }

  eye-db:
    image: postgres:17-alpine
    environment: { POSTGRES_USER: greedy_eye, POSTGRES_PASSWORD: password, POSTGRES_DB: greedy_eye }
```

The MCP server is **not** a compose service — it is a stdio binary run on the host
(`greedy-eye-mcp`, `make build`) pointed at the backend with a psina PAT. See
[docs/development.md](docs/development.md#mcp-server).

## License

MIT
