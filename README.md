# Greedy Eye Frontend

Dashboard frontend for Greedy Eye portfolio management platform.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query v5
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+
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

Generate TypeScript types from backend OpenAPI spec:

```bash
npx swagger2openapi ../greedy-eye/docs/openapi.yaml -o src/lib/types/openapi-v3.yaml
npx openapi-typescript src/lib/types/openapi-v3.yaml -o src/lib/types/api.ts
```

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

- **[Architecture](docs/architecture.md)** - System design (arc42)
- **[ADR Log](docs/ARCHITECTURE_DECISIONS.md)** - Architecture decisions

## Development Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Foundation (layout, API client, types) |
| 2 | 🔄 | Portfolio list page |
| 3 | 📋 | Portfolio detail, holdings |
| 4 | 📋 | Price charts, real-time |

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

## License

MIT
