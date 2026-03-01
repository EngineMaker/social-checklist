# Flarestack

## Overview

Full-stack Cloudflare application template with Turborepo monorepo.

## Tech Stack

- **Monorepo**: Turborepo
- **API**: Hono (TypeScript) → Cloudflare Workers
- **Frontend**: Next.js (App Router) → Cloudflare Pages (OpenNext)
- **Database**: Cloudflare D1 (SQLite)
- **Shared types**: Zod schemas → packages/shared
- **Auth**: Clerk
- **IaC**: wrangler.jsonc
- **Language**: TypeScript

## Directory Structure

```
flarestack/
├── apps/
│   ├── api/          # Hono API (Cloudflare Workers)
│   │   ├── src/
│   │   ├── test/
│   │   └── wrangler.jsonc
│   └── web/          # Next.js frontend (Cloudflare Pages)
│       └── src/
├── packages/
│   └── shared/       # Zod schemas, type definitions, validation
├── turbo.json
├── package.json
└── CLAUDE.md
```

## Development Rules

- Package manager: **bun**
- Test: vitest
- Linter/Formatter: Biome
- Commit messages: Conventional Commits
- Environment variables: `.dev.vars` (Wrangler) / `.env.local` (Next.js) — never commit

## API Endpoints

- `GET /` — API info
- `GET /health` — D1 health check
- `POST /items` — Create item (auth required)
- `GET /items` — List items (public)
- `GET /items/:id` — Get item by ID (public)
- `PATCH /items/:id` — Update item (auth required)

## Auth Pattern

- API: `@hono/clerk-auth` — POST/PATCH require auth, GET is public
- Web: `@clerk/nextjs` — ClerkProvider, middleware, Header (SignIn/UserButton)
- Tests: `vi.mock` for `@hono/clerk-auth`, `createApp()` factory pattern
