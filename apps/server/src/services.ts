import { createAuth as createConfiguredAuth } from "@helios/auth";
import { createCaptureMailer } from "@helios/auth/mailer";
import type { Mailer } from "@helios/auth/mailer";
import { createDb } from "@helios/db";
import type { Database } from "@helios/db";
import { log } from "evlog";

import { ENV } from "./env.server";

const magicLinkText = (url: string) =>
  `Open this link to sign in to Helios:\n\n${url}\n\nIt works once and expires in 5 minutes. If you did not ask for it, ignore this email.`;

const emailMailer: Mailer = {
  sendMagicLink: async (to, url) => {
    await ENV.EMAIL.send({
      from: ENV.EMAIL_FROM,
      to,
      subject: "Sign in to Helios",
      text: magicLinkText(url),
    });
  },
};

/** Outside production, links are logged and kept for `/dev/magic-link` instead of emailed. */
export const capturedMail =
  ENV.APP_ENV === "production"
    ? undefined
    : createCaptureMailer((to, url) => {
        log.info({ action: "magic_link_captured", to, url });
      });

export const getDb = (): Database => createDb(ENV);

export const createAuth = (database: Database = getDb()) =>
  createConfiguredAuth(ENV, database, capturedMail ?? emailMailer);
