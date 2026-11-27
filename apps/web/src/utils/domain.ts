import { stateCategories } from "@helios/api/domain";
import type { AppRouterClient } from "@helios/api/routers/index";
import type { InferClientOutputs } from "@orpc/client";

type Outputs = InferClientOutputs<AppRouterClient>;

export type Project = Outputs["projects"]["get"];

/** A Project as the sidebar and the pickers list it, without its Workflow States. */
export type ProjectSummary = Outputs["projects"]["list"][number];

export type WorkflowState = Project["states"][number];

export type BoardColumn = Outputs["issues"]["board"][number];

export type IssueRow = BoardColumn["issues"][number];

export type StateCategory = WorkflowState["category"];

export type MemberSummary = NonNullable<IssueRow["assignee"]>;

type IssueDetail = Outputs["issues"]["get"];

export type TimelineEntry = IssueDetail["timeline"][number];

export type Member = Outputs["workspace"]["members"][number];

export const roleLabels: Record<Member["role"], string> = {
  admin: "Administrador",
  member: "Miembro",
};

const categoryLabels: Record<StateCategory, string> = {
  ideas: "Ideas",
  backlog: "Pendiente",
  started: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
};

/** State Categories in board order, with the words the UI shows for them. */
export const categories = stateCategories.map((value) => ({
  value,
  label: categoryLabels[value],
}));

export const suggestPrefix = (name: string) => {
  const words = name
    .toUpperCase()
    .replaceAll(/[^A-Z\s]/gu, "")
    .split(/\s+/u)
    .filter(Boolean);

  const MAX = 3;

  return (
    words.length > 1 ? words.map((word) => word[0]).join("") : (words[0] ?? "")
  ).slice(0, MAX);
};
