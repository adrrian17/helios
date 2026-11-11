import { appRouter } from "@helios/api/routers/index";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { initLogger } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import { evlog } from "evlog/hono";
import type { EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { createContext } from "./context";
import { ENV } from "./env.server";
import { capturedMail, createAuth } from "./services";

initLogger({
  env: { service: "helios-server" },
});

const identifyUser = createAuthMiddleware(createAuth(), {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

const app = new Hono<EvlogVariables>();

app.use(evlog());

app.use("*", async (c, next) => {
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);

  await next();
});

app.use(
  "/*",
  cors({
    origin: ENV.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(
  ["POST", "GET"],
  "/api/auth/*",
  async (c) => await createAuth().handler(c.req.raw)
);

if (capturedMail) {
  const mail = capturedMail;
  app.get("/dev/magic-link", (c) => {
    const url = mail.lastLinkTo(c.req.query("email") ?? "");

    return url === undefined ? c.json({ url: null }, 404) : c.json({ url });
  });
}

const logError: Parameters<typeof onError>[0] = (error) => {
  console.error(error);
};

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [onError(logError)],
});

app.use("/*", async (c, next) => {
  const context = await createContext(c.req.raw.headers);

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  await next();

  return c.res;
});

app.get("/", (c) => c.text("OK"));

export default app;
