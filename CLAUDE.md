# Social Checklist

## Overview

Create, share, and fork checklists for any event — camping, wedding, startup, moving, travel, and more.

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
social-checklist/
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
- `POST /checklists` — Create checklist (auth required)
- `GET /checklists` — List public checklists (with category filter & pagination)
- `GET /checklists/:id` — Get checklist with items (public)
- `PATCH /checklists/:id` — Update checklist (owner only)
- `POST /checklists/:id/items` — Add item (owner only)
- `PATCH /checklists/:id/items/:itemId` — Update item (owner only)
- `DELETE /checklists/:id/items/:itemId` — Delete item (owner only)
- `POST /checklists/:id/fork` — Fork checklist (auth required)

## Auth Pattern

- API: `@hono/clerk-auth` — POST/PATCH/DELETE require auth, GET is public
- Ownership: PATCH/DELETE on checklists and items require owner match (403 otherwise)
- Web: `@clerk/nextjs` — ClerkProvider, middleware, Header (SignIn/UserButton)
- Tests: `vi.mock` for `@hono/clerk-auth`, `createApp()` factory pattern

## Data Model

- **checklists**: title, description, category, user_id, is_public, forked_from
- **checklist_items**: checklist_id (FK), title, product_url, sort_order, is_checked
- Categories: camping, wedding, startup, moving, travel, other
