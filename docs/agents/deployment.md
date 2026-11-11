# Deployment

`packages/infra/alchemy.run.ts` defines the Cloudflare resources (web, server Worker, D1) and the migrations folder Alchemy applies on deploy.

- Never run `pnpm deploy`, `pnpm destroy` or `alchemy` commands unless asked; they change real Cloudflare resources.
- `pnpm deploy` runs with `APP_ENV=production` and defaults to a personal `dev_<username>` stage. Production uses an explicit stage: `cd packages/infra && pnpm exec alchemy deploy --stage production`.
- After the first deploy, set `CORS_ORIGIN` to the exact deployed web origin, then redeploy the server. In CI it comes from a repository secret exposed to the deploy job as an env var; never commit it in an env file.
- `apps/server/cloudflare-env.d.ts` is hand-written; it infers Worker binding types from `alchemy.run.ts`.
