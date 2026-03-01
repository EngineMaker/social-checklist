# Flarestack

Full-stack Cloudflare application template powered by **Turborepo**, **Hono**, **Next.js**, **D1**, and **Clerk**.

Click **"Use this template"** on GitHub to create your own project instantly.

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

### 1. Create from template

```bash
# Click "Use this template" on GitHub, then clone your repo
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
bun install
```

### 2. Set up Cloudflare D1

```bash
# Create a D1 database
bun wrangler d1 create <your-app-name>

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
bun wrangler d1 migrations apply <your-app-name> --local
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
| `POST` | `/items` | Required | Create item |
| `GET` | `/items` | Public | List items (with filtering & pagination) |
| `GET` | `/items/:id` | Public | Get item by ID |
| `PATCH` | `/items/:id` | Required | Update item |

### Query Parameters (GET /items)

- `status` — Filter by status (`open`, `in_progress`, `done`, `closed`)
- `limit` — Items per page (default: 20, max: 100)
- `offset` — Pagination offset (default: 0)

## Project Structure

```
flarestack/
├── apps/
│   ├── api/              # Hono API (Cloudflare Workers)
│   │   ├── src/
│   │   │   ├── index.ts          # App entry point
│   │   │   ├── routes/items.ts   # CRUD routes
│   │   │   ├── routes/health.ts  # Health check
│   │   │   └── middleware/auth.ts # Auth middleware
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

## Customization

1. **Rename the project**: Update `name` fields in `package.json`, `apps/*/package.json`, `packages/*/package.json`, and `wrangler.jsonc` files
2. **Change the data model**: Edit `packages/shared/src/index.ts` (schemas), `apps/api/src/routes/items.ts` (API), and `apps/api/migrations/` (SQL)
3. **Add CORS origins**: Update the `origin` array in `apps/api/src/index.ts`
4. **Add new API routes**: Create files in `apps/api/src/routes/` and register in `apps/api/src/index.ts`

## License

MIT
