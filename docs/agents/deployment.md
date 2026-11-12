# Deployment

`packages/infra/alchemy.run.ts` defines the Cloudflare resources (web, server Worker, D1) and the migrations folder Alchemy applies on deploy.

- Never run `pnpm deploy`, `pnpm destroy` or `alchemy` commands unless asked; they change real Cloudflare resources.
- `pnpm deploy` runs with `NODE_ENV=production` and defaults to a personal `dev_<username>` stage. Production uses an explicit stage: `cd packages/infra && pnpm exec alchemy deploy --stage production`.
- After the first deploy, `CORS_ORIGIN` must be set to the exact deployed web origin, then the server redeployed.
- `apps/server/cloudflare-env.d.ts` is hand-written; it infers Worker binding types from `alchemy.run.ts`.
