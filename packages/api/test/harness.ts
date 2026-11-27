import { createAuth } from "@helios/auth";
import { createCaptureMailer } from "@helios/auth/mailer";
import { createDb } from "@helios/db";
import { createRouterClient } from "@orpc/server";

import { createContext } from "../src/context";
import { appRouter } from "../src/routers/index";
import { applyMigrations, createEmptyD1 } from "./d1";

const SERVER_URL = "https://api.helios.test";
const WEB_URL = "https://helios.test";
export const ADMIN_EMAIL = "admin@helios.test";

/** A fresh, empty D1 database with every migration applied; dispose it with `await using`. */
export const createHarness = async () => {
  const empty = await createEmptyD1();
  const { d1 } = empty;
  await applyMigrations(d1);

  const db = createDb({ DB: d1 });
  const mailer = createCaptureMailer();

  const authFor = (adminEmail: string) =>
    createAuth(
      {
        ADMIN_EMAIL: adminEmail,
        BETTER_AUTH_SECRET: "test-only-better-auth-secret-0123456789",
        BETTER_AUTH_URL: SERVER_URL,
        CORS_ORIGIN: WEB_URL,
      },
      db,
      mailer
    );

  const auth = authFor(ADMIN_EMAIL);

  /** Requests a magic link the way the sign-in page does. */
  const requestLink = async (email: string, viaAuth = auth) => {
    const response = await viaAuth.handler(
      new Request(`${SERVER_URL}/api/auth/sign-in/magic-link`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEB_URL },
        body: JSON.stringify({ email, callbackURL: `${WEB_URL}/` }),
      })
    );

    return { status: response.status, body: await response.text() };
  };

  /** Opens a link like a browser would and returns the cookies it set. */
  const openLink = async (url: string) => {
    const response = await auth.handler(new Request(url));

    const cookie = response.headers
      .getSetCookie()
      .map((header) => header.split(";")[0])
      .join("; ");

    return new Headers({ cookie });
  };

  const signIn = async (email: string) => {
    await requestLink(email);
    const link = mailer.lastLinkTo(email);

    if (link === undefined) {
      throw new Error(`No magic link was sent to ${email}`);
    }

    return await openLink(link);
  };

  const clientFor = (headers = new Headers()) =>
    createRouterClient(appRouter, {
      context: async () => await createContext({ auth, db, headers }),
    });

  return {
    authFor,
    clientFor,
    mailer,
    openLink,
    requestLink,
    signIn,
    [Symbol.asyncDispose]: async () => {
      await empty[Symbol.asyncDispose]();
    },
  };
};

export type Harness = Awaited<ReturnType<typeof createHarness>>;
