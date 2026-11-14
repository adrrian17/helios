# Deployment

`packages/infra/alchemy.run.ts` defines the Cloudflare resources (web, server Worker, D1) and the migrations folder Alchemy applies on deploy. The server Worker gets the `DB` D1 binding, the `EMAIL` `send_email` binding and the env vars `APP_ENV`, `ADMIN_EMAIL`, `EMAIL_FROM`, `CORS_ORIGIN`, `BETTER_AUTH_SECRET` (redacted) and `BETTER_AUTH_URL` (the Worker's own URL).

- Never run `pnpm deploy`, `pnpm destroy` or `alchemy` commands unless asked; they change real Cloudflare resources.
- `pnpm deploy` runs with `APP_ENV=production` and defaults to a personal `dev_<username>` stage. A manual production deploy uses an explicit stage and the same origin the workflow exports: `cd packages/infra && CORS_ORIGIN=https://helios-web-production.adrian-secovam.workers.dev pnpm exec alchemy deploy --stage production`.
- CI (`.github/workflows/ci.yml`, after `check` passes): a pull request deploys the stage `pr-<number>`, and a push to `main` deploys `production`. `preview-cleanup.yml` destroys `pr-<number>` when the pull request closes, merged or not. Fork pull requests get no deploy. Both share the concurrency group `deploy-<stage>`.
- Repository secrets the workflows need: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ADMIN_EMAIL`, `EMAIL_FROM`, `BETTER_AUTH_SECRET`. Previews also run with `APP_ENV=production`.
- `CORS_ORIGIN` is not a secret. On `production` and `pr-<number>` stages the web Worker has the fixed name `helios-web-<stage>`, so its origin is `https://helios-web-<stage>.adrian-secovam.workers.dev` and the workflows export it before deploying. Keep the name in `alchemy.run.ts` and the workflows in sync. Other stages (`dev_<user>`) keep generated names.
- The CI API token needs these permission groups on the account: Workers Scripts Write, D1 Write, Secrets Store Write (`Cloudflare.state()` keeps state in a Secrets Store-backed Worker). The `send_email` binding is Worker metadata, so no separate email permission was found in the Alchemy source.
- `apps/server/cloudflare-env.d.ts` is hand-written; it infers Worker binding types from `alchemy.run.ts`.
- The server Worker gets an `EMAIL` `send_email` binding for Cloudflare Email Service. Production needs the Workers Paid plan and `EMAIL_FROM` on a domain onboarded to Email Service; set `ADMIN_EMAIL` and `EMAIL_FROM` like the other production values.
- The seed has no deploy step: the server runs it at the start of every magic-link request, and it does nothing once the Workspace exists. After the first deploy, the `ADMIN_EMAIL` person requests a link on the sign-in page and becomes the first Admin.
- With `APP_ENV=production` the server never builds the capture Mailer and has no `/dev/magic-link` route.

## First production deploy (done by a person)

Agents prepare and document; the user runs these, because they need a Cloudflare account and change real resources. The README holds the same list for people.

1. Put the Cloudflare account on the Workers Paid plan; Email Service needs it to send to arbitrary addresses.
2. Onboard the sender domain to Cloudflare Email Service and verify it. `EMAIL_FROM` must be an address on that domain.
3. Log Alchemy in to the account: `cd packages/infra && pnpm exec alchemy profile edit`.
4. Add the repository secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ADMIN_EMAIL`, `EMAIL_FROM` and `BETTER_AUTH_SECRET` (32+ random characters, for example `openssl rand -base64 32`).
5. Merge to `main`; the workflow deploys `production`. For a manual deploy, set the same values in `.env.production` at the repo root (git-ignored) and export `CORS_ORIGIN=https://helios-web-production.adrian-secovam.workers.dev`.
6. Open `https://helios-web-production.adrian-secovam.workers.dev` and request a sign-in link for `ADMIN_EMAIL`; that request seeds the Workspace and the first Admin.
