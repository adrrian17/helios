# Deployment

`packages/infra/alchemy.run.ts` defines the Cloudflare resources (web, server Worker, D1) and the migrations folder Alchemy applies on deploy.

- Never run `pnpm deploy`, `pnpm destroy` or `alchemy` commands unless asked; they change real Cloudflare resources.
- `pnpm deploy` runs with `APP_ENV=production` and defaults to a personal `dev_<username>` stage. Production uses an explicit stage: `cd packages/infra && pnpm exec alchemy deploy --stage production`.
- After the first deploy, set `CORS_ORIGIN` to the exact deployed web origin, then redeploy the server. In CI it comes from a repository secret exposed to the deploy job as an env var; never commit it in an env file.
- `apps/server/cloudflare-env.d.ts` is hand-written; it infers Worker binding types from `alchemy.run.ts`.
- The server Worker gets an `EMAIL` `send_email` binding for Cloudflare Email Service. Production needs the Workers Paid plan and `EMAIL_FROM` on a domain onboarded to Email Service; set `ADMIN_EMAIL` and `EMAIL_FROM` like the other production values.
- The seed has no deploy step: the server runs it at the start of every magic-link request, and it does nothing once the Workspace exists. After the first deploy, the `ADMIN_EMAIL` person requests a link on the sign-in page and becomes the first Admin.
- With `APP_ENV=production` the server never builds the capture Mailer and has no `/dev/magic-link` route.
