# helios

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **workers** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **Cloudflare D1** - Database engine
- **Authentication** - Better-Auth
- **PWA** - Progressive Web App support
- **Vite+** - Unified Vite toolchain, workspace task runner, linting, and formatting

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses Cloudflare D1 (SQLite) with Drizzle ORM.

Runtime database access uses the Cloudflare `DB` binding from `packages/infra/alchemy.run.ts`. If a local `DATABASE_URL` is present, it is only for database tooling.

Alchemy provisions the D1 database and applies migrations during `deploy`.

1. Generate migration files:

```bash
pnpm run db:generate
```

Then, run the development server:

```bash
pnpm run dev
```

Open [https://helios.localhost](https://helios.localhost) (served through portless). Press `?` in the app for keyboard shortcuts, or Cmd+K (Ctrl+K) for the command palette. The API runs at [https://api.helios.localhost](https://api.helios.localhost).

## Signing in locally

Helios signs Members in with magic links only. In development no email is sent:

1. Open the sign-in page and enter `ADMIN_EMAIL` (`admin@helios.localhost` unless your `.env` overrides it). The first request seeds the Workspace and makes that address the first Admin.
2. Copy the link from the server log (`magic_link_captured`), or fetch it from `https://api.helios.localhost/dev/magic-link?email=<address>`. That route exists only outside production.

## Tests

```bash
pnpm test                              # API rules: oRPC in-process, fresh Miniflare D1 per test
pnpm exec playwright install chromium  # once
pnpm test:e2e                          # Playwright on desktop and phone; starts or reuses `pnpm dev`
```

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@helios/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Environment Configuration

Every env var is declared once in the root `.env.schema`. Apps and packages import the items they use with `@import(../../, pick=[...])` in their own `.env.schema`, and local values live in the root `.env`. Development needs no `.env`: the schema provides local defaults that apply only when `APP_ENV=development`, and `pnpm deploy` runs with `APP_ENV=production`, so production values must be set explicitly. In CI, the deploy job gets `BETTER_AUTH_SECRET`, `ADMIN_EMAIL` and `EMAIL_FROM` from repository secrets and derives `CORS_ORIGIN` from the stage (see Deployment); process env overrides the schema. Varlock generates `src/env.ts` during installation; run `pnpm run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

For Cloudflare, Alchemy loads and validates deployment inputs with `varlock/auto-load` in its Node/Bun deployment process. Worker code reads native bindings; web clients use the framework's public env API through `src/env.public.ts` where needed. Alchemy supplies resource URLs and managed database credentials. In-Worker Varlock protections are deferred until an official Alchemy integration is available; see [the non-Wrangler deployment guidance](https://varlock.dev/integrations/cloudflare/#non-wrangler-deploy-tools-alchemy-sst-pulumi).

The framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

## Deployment

### Alchemy

- Target: web on Cloudflare + server on Cloudflare
- Configure provider accounts: `cd packages/infra && pnpm exec alchemy profile edit`
- Dev: pnpm run dev
- Deploy: pnpm run deploy
- Destroy: pnpm run destroy

`alchemy profile edit` stores the selected Axiom, Cloudflare, Neon, PlanetScale, and/or Prisma provider profiles under `~/.alchemy`; no provider-specific setup command is required by this scaffold.

Deploys are staged and default to a personal `dev_<username>` stage. In CI, every pull request deploys a preview on the stage `pr-<number>`, closing the pull request destroys it, and every push to `main` deploys `production`. Fork pull requests get no preview.

The workflows need these repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ADMIN_EMAIL`, `EMAIL_FROM` and `BETTER_AUTH_SECRET`. The API token needs the permission groups Workers Scripts Write, D1 Write and Secrets Store Write on the account.

`CORS_ORIGIN` is not a secret. The web Worker has a fixed name on `production` and `pr-<number>` stages, so its origin is `https://helios-web-<stage>.adrrian17.workers.dev` and the workflows export it before deploying. A manual production deploy must export the same value:

```bash
cd packages/infra && CORS_ORIGIN=https://helios-web-production.adrrian17.workers.dev pnpm exec alchemy deploy --stage production
```

### First production deploy

Helios ships the deploy configuration but nobody has run it; these steps need your Cloudflare account.

1. Put the Cloudflare account on the **Workers Paid plan**. Cloudflare Email Service needs it to send magic links to arbitrary addresses.
2. Onboard your sender domain to **Cloudflare Email Service** and verify it. `EMAIL_FROM` must be an address on that domain, such as `helios@example.com`.
3. Log Alchemy in: `cd packages/infra && pnpm exec alchemy profile edit`.
4. Add the repository secrets listed above:
   - `ADMIN_EMAIL`: the first Admin's address.
   - `EMAIL_FROM`: the verified sender from step 2.
   - `BETTER_AUTH_SECRET`: 32 or more random characters, for example from `openssl rand -base64 32`.
   - `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`: the token and account the workflows deploy to.
5. Merge to `main`. The workflow deploys `production` and applies the D1 migrations. For a manual deploy, put the same values in `.env.production` at the repo root (git-ignored) and use the command above.
6. Open `https://helios-web-production.adrrian17.workers.dev` and request a sign-in link for `ADMIN_EMAIL`. That first request creates the Workspace and the first Admin; there is no separate seed step, and later requests leave both alone.

The Worker sends mail through its `EMAIL` (`send_email`) binding. With `APP_ENV=production` the capture Mailer and the `/dev/magic-link` route do not exist.

## Git Hooks and Formatting

- Vite+ Git hooks install automatically on `pnpm install` (`prepare` runs `vp config`)
- Docs: [Vite+ commit hooks](https://viteplus.dev/guide/commit-hooks)
- Run checks: `pnpm run check`

## Project Structure

```
helios/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run db:generate`: Generate database client/types
- `pnpm run check`: Run Vite+ format, lint and type checks
- `pnpm run lint`: Run Vite+ lint checks
- `pnpm run format`: Run Vite+ formatting
- `pnpm run staged`: Run Vite+ checks against staged files
- `cd apps/web && pnpm run generate-pwa-assets`: Generate PWA assets
