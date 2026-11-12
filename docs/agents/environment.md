# Environment

Env vars are managed with Varlock. Load the `varlock` skill before changing them.

- Every var is declared once in the root `.env.schema`. Apps and packages import what they use with `@import(../../, pick=[...])` in their own `.env.schema`.
- `src/env.ts` in `apps/web`, `apps/server` and `packages/db` is generated and git-ignored. After changing a schema, run `pnpm env:generate`; never edit `env.ts` by hand.
- Application code imports the generated `ENV`. Web code that needs public values uses `src/env.public.ts`.
- `APP_ENV` selects the environment, not `NODE_ENV`, because the Alchemy CLI forces `NODE_ENV=production` even in `alchemy dev`.
- Development needs no `.env`: the schema provides defaults when `APP_ENV=development`. Production values must be set explicitly, from CI secrets in CI.
- Never read, print or commit values from `.env` or `.env.production`. Inspect the schema instead.
