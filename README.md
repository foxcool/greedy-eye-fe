# Greedy Eye Frontend

Dashboard frontend for Greedy Eye portfolio management platform.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query v5
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 20+ (CI builds on 22; Next.js 16 requires Node 20.9+)
- Backend API running on http://localhost:8080

### Installation

```bash
npm install
cp .env.example .env.local
```

### Development

```bash
npm run dev
# Open http://localhost:3000
```

### Type Generation

Backend types live in `src/lib/api/backend-types.ts`, hand-maintained to
match the backend `api/v1/*.proto` files (the source of truth). The backend
serves Connect-RPC, which the OpenAPI generator does not cover, so there is
no OpenAPI spec to generate from — mirror proto changes into `backend-types.ts`
by hand.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Protected dashboard routes
│   ├── layout.tsx          # Root layout
│   └── providers.tsx       # Client-side providers
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/             # Header, Sidebar
│   └── {feature}/          # Feature components
├── lib/
│   ├── api/                # API client & services
│   ├── types/              # TypeScript types
│   └── config/             # Configuration
└── hooks/                  # Custom React hooks
```

## Documentation

- **[Architecture](docs/architecture.md)** — system design + ADRs (arc42)
- **[Development](docs/development.md)** — local dev, Docker/Traefik stack, MCP

## Features

- **Dashboard** (`/`) — macro/world-finance overview widgets (rates, markets, crypto, news)
- **Portfolios** (`/portfolios`, `/portfolios/[id]`) — aggregate + per-portfolio
  Overview / Holdings / Settings, with editable target allocations
- **Rules** (`/rules`) — automation rules + manual rebalance actions
- **Prices** (`/prices`) — asset prices and history charts
- **Settings** (`/settings`) — personal access tokens (MCP) and accounts

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_MOCK_USER_ID=mock-user-123
```

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
