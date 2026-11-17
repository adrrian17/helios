import { createAuth as createConfiguredAuth } from "@helios/auth";
import { createCaptureMailer } from "@helios/auth/mailer";
import type { Mailer } from "@helios/auth/mailer";
import { createDb } from "@helios/db";
import type { Database } from "@helios/db";
import { log } from "evlog";

import { ENV } from "./env.server";

const magicLinkText = (url: string) =>
  `Abre este enlace para iniciar sesión en Helios:\n\n${url}\n\nFunciona una sola vez y caduca en 5 minutos. Si no lo pediste, ignora este correo.`;

const emailMailer: Mailer = {
  sendMagicLink: async (to, url) => {
    await ENV.EMAIL.send({
      from: ENV.EMAIL_FROM,
      to,
      subject: "Inicia sesión en Helios",
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
