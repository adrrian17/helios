import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@helios/db";
// oxlint-disable-next-line sonarjs/no-wildcard-import -- the Drizzle adapter needs every auth table.
import * as schema from "@helios/db/schema/auth";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";

import type { Mailer } from "./mailer";
import { admitMember, canReceiveMagicLink } from "./members";
import { seed } from "./seed";

export interface AuthConfig {
  ADMIN_EMAIL: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
}

// Members stay signed in until they sign out; each visit extends the session.
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 365;

export const createAuth = (
  env: AuthConfig,
  database: Database,
  mailer: Mailer
) =>
  betterAuth({
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    session: { expiresIn: SESSION_LIFETIME_SECONDS },
    databaseHooks: {
      session: {
        create: {
          before: async (session) =>
            await admitMember(database, session.userId),
        },
      },
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      magicLink({
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }, ctx) => {
          await seed(database, env.ADMIN_EMAIL);

          if (!(await canReceiveMagicLink(database, email))) {
            return;
          }

          try {
            await mailer.sendMagicLink(email, url);
          } catch (error) {
            // A delivery failure must not change the response, or it would reveal who has access.
            ctx?.context.logger.error("Sending a magic link failed", error);
          }
        },
      }),
    ],
  });

export type Auth = ReturnType<typeof createAuth>;

export type Session = Auth["$Infer"]["Session"];
