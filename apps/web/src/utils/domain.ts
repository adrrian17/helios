import { priorities, stateCategories } from "@helios/api/domain";
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

export type Priority = IssueRow["priority"];

export type MemberSummary = NonNullable<IssueRow["assignee"]>;

export type IssueDetail = Outputs["issues"]["get"];

export type TimelineEntry = IssueDetail["timeline"][number];

export type Label = Outputs["labels"]["list"][number];

export type Member = Outputs["workspace"]["members"][number];

export const roleLabels: Record<Member["role"], string> = {
  admin: "Admin",
  member: "Member",
};

const categoryLabels: Record<StateCategory, string> = {
  ideas: "Ideas",
  backlog: "Backlog",
  started: "Started",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** State Categories in board order, with the words the UI shows for them. */
export const categories = stateCategories.map((value) => ({
  value,
  label: categoryLabels[value],
}));

/** The order pickers offer Priorities in, as Linear does: no priority first, then most to least urgent. */
export const pickerPriorities: Priority[] = [
  "none",
  ...priorities.filter((priority) => priority !== "none"),
];

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

/** The preset Label colours, so Labels stay readable in both themes. */
export const labelColors = [
  { value: "#94a3b8", name: "Grey" },
  { value: "#ef4444", name: "Red" },
  { value: "#f97316", name: "Orange" },
  { value: "#eab308", name: "Yellow" },
  { value: "#22c55e", name: "Green" },
  { value: "#14b8a6", name: "Teal" },
  { value: "#3b82f6", name: "Blue" },
  { value: "#6366f1", name: "Indigo" },
  { value: "#a855f7", name: "Purple" },
  { value: "#ec4899", name: "Pink" },
] as const;

export const nextLabelColor = (labelCount: number) =>
  (labelColors[labelCount % labelColors.length] ?? labelColors[0]).value;
