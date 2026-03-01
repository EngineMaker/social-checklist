# Contributing

Thank you for your interest in contributing to this project!

## Development Setup

1. Fork & clone the repository

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

2. Install dependencies

```bash
bun install
```

3. Set up environment variables

```bash
# API
cp apps/api/.dev.vars.example apps/api/.dev.vars

# Web
cp apps/web/.env.local.example apps/web/.env.local
```

4. Apply local D1 migrations

```bash
cd apps/api && bun wrangler d1 migrations apply social-checklist --local
```

5. Start the development server

```bash
bun dev
```

## Branch Strategy

- The `main` branch auto-deploys to production
- Create feature branches for new work
- Branch naming: `feat/add-feature`, `fix/bug-description`

```bash
git checkout -b feat/your-feature-name
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>: <description>

[optional body]
```

### Types

| Type | Purpose |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code refactoring (no behavior change) |
| `test` | Adding or updating tests |
| `chore` | Build process or tooling changes |

### Examples

```
feat: add item creation form
fix: resolve API validation error
docs: update setup instructions in README
```

## Code Style

- **Biome** handles linting and formatting
- Indentation uses **tabs**
- Run lint before committing:

```bash
bun run lint
```

## Testing

Add or update tests related to your changes.

```bash
# Run all tests
bun test

# Run API tests only
cd apps/api && bun test
```

## Pull Requests

1. Work on a feature branch and keep commits focused
2. Ensure `bun run lint` and `bun test` pass
3. Create a PR targeting `main`
4. Include in the PR description:
   - Summary of changes
   - Related issue number (if any)
   - How to test

## PR Review Criteria

- CI (lint + typecheck + test) passes
- Consistent with existing code style
- Includes appropriate tests
- Changes are minimal and purpose is clear
