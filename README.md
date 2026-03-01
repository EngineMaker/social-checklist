# Social Checklist

Create, share, and fork checklists for any event — camping, wedding, startup, moving, travel, and more.

Built with **Turborepo**, **Hono**, **Next.js**, **Cloudflare D1**, and **Clerk**.

## Tech Stack

| Layer | Technology | Deploy Target |
|-------|-----------|--------------|
| API | Hono (TypeScript) | Cloudflare Workers |
| Frontend | Next.js (App Router) | Cloudflare Pages |
| Database | Cloudflare D1 (SQLite) | Cloudflare |
| Auth | Clerk | — |
| Monorepo | Turborepo | — |
| Shared | Zod schemas | — |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.3.8+
- [Cloudflare account](https://dash.cloudflare.com/)
- [Clerk account](https://clerk.com/)

### 1. Clone & install

```bash
git clone https://github.com/EngineMaker/social-checklist.git
cd social-checklist
bun install
```

### 2. Set up Cloudflare D1

```bash
bun wrangler d1 create social-checklist
# Copy the database_id from the output and update apps/api/wrangler.jsonc
```

### 3. Set up Clerk

1. Create a Clerk application at [clerk.com](https://clerk.com/)
2. Copy your keys into the env files:

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/web/.env.local.example apps/web/.env.local
# Edit both files with your Clerk keys
```

### 4. Run migrations

```bash
cd apps/api
bun wrangler d1 migrations apply social-checklist --local
```

### 5. Start development

```bash
bun dev
```

- API: http://localhost:8787
- Web: http://localhost:3000

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Public | API info |
| `GET` | `/health` | Public | D1 health check |
| `POST` | `/checklists` | Required | Create checklist |
| `GET` | `/checklists` | Public | List public checklists |
| `GET` | `/checklists/:id` | Public | Get checklist with items |
| `PATCH` | `/checklists/:id` | Owner | Update checklist |
| `POST` | `/checklists/:id/items` | Owner | Add item |
| `PATCH` | `/checklists/:id/items/:itemId` | Owner | Update item |
| `DELETE` | `/checklists/:id/items/:itemId` | Owner | Delete item |
| `POST` | `/checklists/:id/fork` | Required | Fork (copy) checklist |

### Query Parameters (GET /checklists)

- `category` — Filter by category (`camping`, `wedding`, `startup`, `moving`, `travel`, `other`)
- `limit` — Items per page (default: 20, max: 100)
- `offset` — Pagination offset (default: 0)

## Project Structure

```
social-checklist/
├── apps/
│   ├── api/              # Hono API (Cloudflare Workers)
│   │   ├── src/
│   │   │   ├── index.ts              # App entry point
│   │   │   ├── routes/checklists.ts  # CRUD + items + fork routes
│   │   │   ├── routes/health.ts      # Health check
│   │   │   └── middleware/auth.ts    # Auth middleware
│   │   ├── test/         # Vitest tests
│   │   ├── migrations/   # D1 SQL migrations
│   │   └── wrangler.jsonc
│   └── web/              # Next.js frontend (Cloudflare Pages)
│       ├── src/app/
│       └── wrangler.jsonc
├── packages/
│   └── shared/           # Zod schemas & types
│       └── src/index.ts
├── turbo.json
└── package.json
```

## Scripts

```bash
bun dev       # Start all dev servers
bun run build # Build all packages
bun run lint  # Lint with Biome
bun run check # TypeScript type check
bun test      # Run all tests
```

## Deploy

### Manual

```bash
# API
cd apps/api && bun wrangler deploy

# Web
cd apps/web && bun run deploy
```

### CI/CD (GitHub Actions)

Set these secrets in your GitHub repository:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

Push to `main` to trigger automatic deployment. PRs run lint, typecheck, and tests via CI.

### Production Clerk Secrets

```bash
# Set secrets for Workers
cd apps/api
bun wrangler secret put CLERK_SECRET_KEY
bun wrangler secret put CLERK_PUBLISHABLE_KEY

cd apps/web
bun wrangler secret put CLERK_SECRET_KEY
bun wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
```

## License

MIT
