# Copilot Instructions — Social Checklist

## Project Overview

Social Checklist is a web app where users create, share, and fork checklists for any event — camping, wedding, startup, moving, travel, and more.

## Tech Stack

| Layer | Technology | Deployment |
|-------|-----------|------------|
| Monorepo | Turborepo | — |
| API | Hono (TypeScript) | Cloudflare Workers |
| Frontend | Next.js (App Router) | Cloudflare Pages (OpenNext) |
| Database | Cloudflare D1 (SQLite) | Cloudflare |
| Auth | Clerk | — |
| Shared | Zod schemas | `packages/shared` |
| Language | TypeScript | — |

## Directory Structure

```
social-checklist/
├── apps/
│   ├── api/          # Hono API → Cloudflare Workers
│   │   ├── src/
│   │   │   ├── index.ts         # App entry, route registration
│   │   │   └── routes/          # Route handlers (checklists.ts)
│   │   ├── test/                # Vitest tests
│   │   └── wrangler.jsonc       # Workers config
│   └── web/          # Next.js → Cloudflare Pages
│       └── src/
│           ├── app/             # App Router pages & layouts
│           ├── components/      # UI components
│           └── lib/             # API client, utilities
├── packages/
│   └── shared/       # Zod schemas, type definitions, validation
│       └── src/
│           └── schemas/         # checklist.ts, item.ts
├── turbo.json
├── biome.json
└── package.json
```

## 言語ルール

- **コミットメッセージ**: 日本語で書く（例: `feat: チェックリストの削除機能を追加`）
- **PR タイトル・本文**: 日本語で書く
- **ソースコード内のコメント**: 日本語で書く
- **変数名・関数名・型名**: 英語（プログラミングの慣例に従う）
- **Issue テンプレートへの回答**: 日本語で書く

## Development Rules

- **Package manager**: bun (never npm/yarn/pnpm)
- **Linter/Formatter**: Biome
- **Indentation**: Tabs (configured in `biome.json`)
- **Commit messages**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)、本文は日本語
- **Branch naming**: `feat/description`, `fix/description`
- **Environment variables**: `.dev.vars` (Wrangler) / `.env.local` (Next.js) — **never commit these**

## Commands

```bash
bun install          # Install dependencies
bun dev              # Start API (8787) + Web (3000)
bun run lint         # Biome lint (NOT bun lint)
bun run check        # TypeScript type check
bun run test         # Run tests via Turborepo (NOT bun test directly)
```

## Coding Patterns

### API (apps/api)

- **Framework**: Hono with Cloudflare Workers bindings
- **Auth middleware**: `@hono/clerk-auth` — `getAuth(c)` to get user info
- **Auth rules**:
  - GET routes are public (no auth required)
  - POST/PATCH/DELETE require auth (`requireAuth` middleware → 401)
  - PATCH/DELETE on owned resources additionally check `user_id` match (→ 403)
- **Database**: D1 via `c.env.DB` binding, raw SQL queries
- **ID generation**: `lower(hex(randomblob(16)))` in SQL
- **Response format**: `c.json({ checklist }, 200)` or `c.json({ error }, 4xx)`

### Web (apps/web)

- **Framework**: Next.js App Router
- **Auth**: `@clerk/nextjs` — `ClerkProvider`, `clerkMiddleware()`, `<SignInButton>`, `<UserButton>`
- **API calls**: Server-side uses Cloudflare Service Binding (`c.env.API`); client-side uses `fetch` to API URL
- **Component convention**: Server Components by default, `"use client"` only when needed (interactivity, hooks)
- **Styling**: Tailwind CSS

### Shared (packages/shared)

- **Schemas**: Zod schemas for validation and type inference
- **Exports**: `CreateChecklistSchema`, `UpdateChecklistSchema`, `ChecklistCategory`, etc.
- **Usage**: Import as `@social-checklist/shared` in both API and Web

### Tests (apps/api/test)

- **Framework**: Vitest with `@cloudflare/vitest-pool-workers`
- **Auth mocking**: `vi.mock("@hono/clerk-auth")` with a `mockUserId` variable
- **App factory**: `createApp()` function for isolated test instances
- **D1 setup**: SQL exec in `beforeAll` to create tables
- **Note**: `noUncheckedIndexedAccess: true` is enabled — array access results are `T | undefined`, use `!` assertion in test files (allowed by Biome override)

## CI/CD

- **PR**: CI runs lint + typecheck + test (`.github/workflows/ci.yml`)
- **Merge to main**: Auto-deploys API to Workers + Web to Pages (`.github/workflows/deploy.yml`)

## Do NOT

- Commit `.dev.vars`, `.env.local`, or any secret/credential files
- Use `bun test` directly — always use `bun run test` (Turborepo)
- Use `npm`, `yarn`, or `pnpm` — this project uses `bun`
- Use spaces for indentation — use tabs (Biome enforced)
- Skip running `bun run lint` before committing
- Modify CI/CD workflows without explicit instruction
- Add dependencies without justification
