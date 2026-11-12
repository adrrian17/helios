# Database

`packages/db` holds the Drizzle schema (`src/schema/`) and migrations (`src/migrations/`) for Cloudflare D1.

## Migrations

1. Change the schema in `packages/db/src/schema/`.
2. Run `pnpm db:generate` and read the generated SQL before keeping it.
3. Commit the schema change and the new migration folder together.

- Never edit a committed migration or any `snapshot.json`; generate a new migration instead.
- Alchemy applies migrations during deploy. Do not run `db:migrate:deploy` unless asked.

## Runtime access

Workers reach the database through the Cloudflare `DB` binding defined in `packages/infra/alchemy.run.ts`. A local `DATABASE_URL`, if present, is only for tooling.

Keep third-party table names as the library defines them (for example Better Auth's `user`), even where `GLOSSARY.md` prefers another word.
