import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@helios/db";
// oxlint-disable-next-line sonarjs/no-wildcard-import -- the Drizzle adapter needs every auth table.
import * as schema from "@helios/db/schema/auth";
import { betterAuth } from "better-auth";

export interface AuthConfig {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
}

export const createAuth = (
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = []
) =>
  betterAuth({
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [],
  });

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
