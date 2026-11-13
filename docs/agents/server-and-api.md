# Server and API

- `apps/server`: Hono app on Cloudflare Workers that mounts the oRPC handler.
- `packages/api`: oRPC routers. Every procedure builds on `memberProcedure` (signed-in active Member, on `context.member`) or `adminProcedure`; there is no public procedure. Register routers in `appRouter`.
- `packages/api/src/domain.ts`: input schemas, limits, labels and Identifier helpers shared with the web app. It imports only zod and `@helios/db/enums` (enums without Drizzle), so the browser bundle can use it.
- `packages/auth`: Better Auth with the magic-link plugin only (`createAuth`), the Mailer port (`mailer.ts`), sign-in rules and `deactivateMember` (`members.ts`), and the seed (`seed.ts`). The sign-in model is described in `docs/adr/0001-cloudflare-single-workspace-magic-links.md`.
- Seed: runs at the start of every magic-link request and does nothing once the Workspace exists, so a fresh install or deploy needs no extra step. The first Admin is `ADMIN_EMAIL`.
- Mailer: production sends through the Worker `EMAIL` (`send_email`) binding from `EMAIL_FROM`. Any other `APP_ENV` uses the capture Mailer: links are logged and served at `GET /dev/magic-link?email=`, a route that exists only outside production.

## Tests

- `pnpm test` runs the API suite (`packages/api/test`): the oRPC router in-process against a fresh Miniflare D1 per test. Start a test with `await using harness = await createHarness()`; use `harness.signIn(email)` and `harness.clientFor(headers)` to act as a Member.
- Assert what a caller observes (procedure results, links sent, sessions), not table contents.
- Shared packages receive config or initialized clients from the app; they do not read env vars themselves (see [environment](environment.md)).

## Skills

- Routes and middleware: `hono`.
- Auth and sessions: `better-auth-best-practices`, `better-auth-security-best-practices`.
- Logging and audit trails: `review-logging-patterns`, `build-audit-logs`.
