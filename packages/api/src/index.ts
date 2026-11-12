import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

const o = os.$context<Context>();

/** Requires a signed-in, active Member and puts it on `context.member`. */
export const memberProcedure = o.use(async ({ context, next }) => {
  const userId = context.session?.user.id;

  const current =
    userId === undefined
      ? undefined
      : await context.db.query.member.findFirst({
          where: { userId, active: true },
          with: { user: { columns: { email: true, name: true } } },
        });

  if (!current) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return await next({ context: { member: current } });
});

export const adminProcedure = memberProcedure.use(async ({ context, next }) => {
  if (context.member.role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }

  return await next();
});
