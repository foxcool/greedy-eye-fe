# Development Guide — Greedy Eye Frontend

How to run the frontend locally, how it fits the multi-service stack, and how to
connect the MCP server. For design, see [architecture.md](architecture.md).

## Prerequisites

- Node.js 18+
- Docker (for the shared dev stack)
- Go 1.25+ (only to build the MCP server)

## Local frontend dev

Two ways to run the FE.

### A. Node dev server (direct backend, mock user)

Fastest inner loop. Talks straight to a backend on `localhost:8080` and injects a
mock user id, so psina is not required.

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
```

`.env.local` keys (all `NEXT_PUBLIC_*`):

| Var | Meaning |
|-----|---------|
| `NEXT_PUBLIC_API_URL` | Backend base URL (`http://localhost:8080`); empty = relative (behind Traefik) |
| `NEXT_PUBLIC_USE_BACKEND` | `true` to use the backend; `false` for mock-only data |
| `NEXT_PUBLIC_USE_LIVE_PRICES` | `true` to fetch CoinGecko prices client-side |
| `NEXT_PUBLIC_MOCK_USER_ID` | Injects `X-User-Id` for direct access (no psina) |

### B. Docker dev (via Traefik)

Runs the FE in a container on the shared `proxy` network, behind Traefik with real
psina auth. Uses `deploy/compose.yaml`.

| Target | Action |
|--------|--------|
| `make up` | Build + start `eye-fe-dev` (detached) |
| `make logs` | Follow FE logs |
| `make stop` / `make down` | Stop / remove |
| `make clean` | Remove with volumes |
| `make deps` | `npm ci` inside the container (after package.json changes) |
| `make lint` / `make typecheck` / `make check` | Lint / types / full pre-commit check |

## Shared infra (Traefik + psina)

The FE, backend, and psina are separate services joined by one external Docker
network and a shared Traefik instance.

```
Browser ──HTTPS──► Traefik ──forwardAuth──► psina /verify
                      │  (200 + X-User-Id)
                      ├──► eye-fe (Next.js)   Host(${EYE_DOMAIN}) && /app, /_next
                      └──► eye    (backend)   Host(${EYE_DOMAIN}) && /eye.v1.*  [h2c]
```

Requirements:

- An external network: `docker network create proxy`.
- A Traefik instance on that network, configured with:
  - a TLS cert resolver,
  - the `web`/`websecure` entrypoints,
  - a forwardAuth middleware pointing at psina's `/verify`,
  - `loadbalancer.server.scheme=h2c` for the Connect-RPC backend.
- Per-service `deploy/.env` with `${EYE_DOMAIN}` (use your own hostname).

Connect-RPC uses h2c (HTTP/2 cleartext); the backend router matches `/eye.v1.*`,
psina matches `/auth.v1.*`.

### Bring-up order

psina must be up first — the backend's forwardAuth depends on it.

```bash
# 0. one-time
docker network create proxy
# (start your Traefik on the proxy network)

# 1. auth
cd ../../psina/deploy            && make up     # or docker compose up -d

# 2. backend
cd ../greedy-eye/deploy          && make up

# 3. frontend
cd ../greedy-eye-fe              && make up
```

### Access restriction (optional)

Routers can carry an extra Traefik middleware to limit exposure (e.g. an IP
allowlist or a private-network-only middleware). Apply it on the FE router via the
ansible var / compose label; keep it out of committed defaults.

## MCP server

`greedy-eye-mcp` is a stdio binary (no container). Build it and point it at a
backend; an MCP client (e.g. Claude) launches it.

```bash
cd ../greedy-eye-mcp
make build                       # → bin/server

GREEDY_EYE_BACKEND_URL=https://${EYE_DOMAIN} \
GREEDY_EYE_AUTH_TOKEN=psn_...   \
  ./bin/server
```

- `GREEDY_EYE_BACKEND_URL` — backend base URL (`http://localhost:8080` direct, or the
  Traefik host).
- `GREEDY_EYE_AUTH_TOKEN` — a psina personal access token (`psn_…`). Behind Traefik
  forwardAuth it is required; mint one at the FE `/settings` page. Empty for direct
  local access.

## Type generation

Regenerate TypeScript types when the backend API contract changes:

```bash
npx swagger2openapi ../greedy-eye/docs/openapi.yaml -o src/lib/types/openapi-v3.yaml
npx openapi-typescript src/lib/types/openapi-v3.yaml -o src/lib/types/api.ts
```

## Troubleshooting

```bash
# FE container joined both networks?
docker inspect eye-fe-dev --format '{{json .NetworkSettings.Networks}}' | jq 'keys'

# Auth failing? Verify psina is reachable from Traefik and returns X-User-Id.
# 401 loops usually mean the psina_access cookie expired and refresh failed.
```
