import type { RouterClient } from "@orpc/server";

import { memberProcedure } from "../index";

export const appRouter = {
  me: memberProcedure.handler(({ context: { member } }) => ({
    id: member.userId,
    email: member.user.email,
    name: member.user.name,
    role: member.role,
  })),
};

export type AppRouter = typeof appRouter;

export type AppRouterClient = RouterClient<typeof appRouter>;
