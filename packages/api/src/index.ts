import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";
import { memberWith } from "./member";

const o = os.$context<Context>();

export const memberProcedure = o.use(async ({ context, next }) => {
  const userId = context.session?.user.id;

  const current =
    userId === undefined
      ? undefined
      : await context.db.query.member.findFirst({
          where: { userId, active: true },
          ...memberWith,
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
