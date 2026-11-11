import type { RouterClient } from "@orpc/server";

import { memberProcedure } from "../index";
import { checklistRouter } from "./checklist";
import { commentsRouter } from "./comments";
import { issuesRouter } from "./issues";
import { labelsRouter } from "./labels";
import { projectsRouter } from "./projects";
import { workflowStatesRouter } from "./workflow-states";
import { workspaceRouter } from "./workspace";

export const appRouter = {
  me: memberProcedure.handler(({ context: { member } }) => ({
    id: member.userId,
    email: member.user.email,
    name: member.user.name,
    role: member.role,
  })),
  workspace: workspaceRouter,
  projects: projectsRouter,
  workflowStates: workflowStatesRouter,
  issues: issuesRouter,
  labels: labelsRouter,
  checklist: checklistRouter,
  comments: commentsRouter,
};

export type AppRouter = typeof appRouter;

export type AppRouterClient = RouterClient<typeof appRouter>;
