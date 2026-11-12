# Server and API

- `apps/server`: Hono app on Cloudflare Workers that mounts the oRPC handler.
- `packages/api`: oRPC routers. Use `publicProcedure` for unauthenticated calls and `protectedProcedure` when a session is required; register routers in `appRouter`.
- `packages/auth`: Better Auth configuration (`createAuth`). The sign-in model is described in `docs/adr/0001-cloudflare-single-workspace-magic-links.md`.
- Shared packages receive config or initialized clients from the app; they do not read env vars themselves (see [environment](environment.md)).

## Skills

- Routes and middleware: `hono`.
- Auth and sessions: `better-auth-best-practices`, `better-auth-security-best-practices`; email/password flows: `email-and-password-best-practices`.
- Logging and audit trails: `review-logging-patterns`, `build-audit-logs`.
