import type { AppRouterClient } from "@helios/api/routers/index";
import type { InferClientOutputs } from "@orpc/client";

type Outputs = InferClientOutputs<AppRouterClient>;

export type Project = Outputs["projects"]["get"];

export type WorkflowState = Project["states"][number];

export type BoardColumn = Outputs["issues"]["board"][number];

export type IssueRow = BoardColumn["issues"][number];

export type StateCategory = WorkflowState["category"];

export type Priority = IssueRow["priority"];

export type MemberSummary = NonNullable<IssueRow["assignee"]>;

/** State Categories in board order, with the words the UI shows for them. */
export const categories: { value: StateCategory; label: string }[] = [
  { value: "ideas", label: "Ideas" },
  { value: "backlog", label: "Backlog" },
  { value: "started", label: "Started" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const priorityLabels: Record<Priority, string> = {
  none: "No priority",
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PREFIX_PATTERN = /^[A-Z]{2,5}$/u;

/** Suggests a prefix from a Project name: initials for several words, else the first letters. */
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
