import type { RouterClient } from "@orpc/server";

import { memberProcedure } from "../index";
import { toMemberSummary } from "../member";
import { commentsRouter } from "./comments";
import { issuesRouter } from "./issues";
import { projectsRouter } from "./projects";
import { workflowStatesRouter } from "./workflow-states";
import { workspaceRouter } from "./workspace";

export const appRouter = {
  me: memberProcedure.handler(({ context: { member } }) => ({
    ...toMemberSummary(member),
    name: member.user.name,
    role: member.role,
  })),
  workspace: workspaceRouter,
  projects: projectsRouter,
  workflowStates: workflowStatesRouter,
  issues: issuesRouter,
  comments: commentsRouter,
};

export type AppRouter = typeof appRouter;

export type AppRouterClient = RouterClient<typeof appRouter>;
