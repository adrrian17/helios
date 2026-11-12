# Deployment

`packages/infra/alchemy.run.ts` defines the Cloudflare resources (web, server Worker, D1) and the migrations folder Alchemy applies on deploy. The server Worker gets the `DB` D1 binding, the `EMAIL` `send_email` binding and the env vars `APP_ENV`, `ADMIN_EMAIL`, `EMAIL_FROM`, `CORS_ORIGIN`, `BETTER_AUTH_SECRET` (redacted) and `BETTER_AUTH_URL` (the Worker's own URL).

- Never run `pnpm deploy`, `pnpm destroy` or `alchemy` commands unless asked; they change real Cloudflare resources.
- `pnpm deploy` runs with `APP_ENV=production` and defaults to a personal `dev_<username>` stage. Production uses an explicit stage: `cd packages/infra && pnpm exec alchemy deploy --stage production`.
- After the first deploy, set `CORS_ORIGIN` to the exact deployed web origin, then redeploy the server. In CI it comes from a repository secret exposed to the deploy job as an env var; never commit it in an env file.
- `apps/server/cloudflare-env.d.ts` is hand-written; it infers Worker binding types from `alchemy.run.ts`.
- The server Worker gets an `EMAIL` `send_email` binding for Cloudflare Email Service. Production needs the Workers Paid plan and `EMAIL_FROM` on a domain onboarded to Email Service; set `ADMIN_EMAIL` and `EMAIL_FROM` like the other production values.
- The seed has no deploy step: the server runs it at the start of every magic-link request, and it does nothing once the Workspace exists. After the first deploy, the `ADMIN_EMAIL` person requests a link on the sign-in page and becomes the first Admin.
- With `APP_ENV=production` the server never builds the capture Mailer and has no `/dev/magic-link` route.

## First production deploy (done by a person)

Agents prepare and document; the user runs these, because they need a Cloudflare account and change real resources. The README holds the same list for people.

1. Put the Cloudflare account on the Workers Paid plan; Email Service needs it to send to arbitrary addresses.
2. Onboard the sender domain to Cloudflare Email Service and verify it. `EMAIL_FROM` must be an address on that domain.
3. Log Alchemy in to the account: `cd packages/infra && pnpm exec alchemy profile edit`.
4. Set the production values in `.env.production` at the repo root (git-ignored) or as CI secrets: `ADMIN_EMAIL`, `EMAIL_FROM`, `BETTER_AUTH_SECRET` (32+ random characters, for example `openssl rand -base64 32`), and a placeholder `CORS_ORIGIN`.
5. Deploy: `cd packages/infra && pnpm exec alchemy deploy --stage production`. It prints the `web` and `server` URLs.
6. Set `CORS_ORIGIN` to the exact `web` origin it printed and deploy again, so the server accepts the app's requests and cookies.
7. Open the web URL and request a sign-in link for `ADMIN_EMAIL`; that request seeds the Workspace and the first Admin.
