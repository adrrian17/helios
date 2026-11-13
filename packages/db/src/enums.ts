/** Board order: columns sort by category first, then by position inside it. */
export const stateCategories = [
  "ideas",
  "backlog",
  "started",
  "completed",
  "cancelled",
] as const;

export type StateCategory = (typeof stateCategories)[number];

/** Most urgent first; `none` sorts last. */
export const priorities = ["urgent", "high", "medium", "low", "none"] as const;

export type Priority = (typeof priorities)[number];

export const memberRoles = ["admin", "member"] as const;

export const invitationStatuses = ["pending", "accepted", "revoked"] as const;

export const activityKinds = [
  "created",
  "title_changed",
  "state_changed",
  "priority_changed",
  "assignee_changed",
  "label_added",
  "label_removed",
] as const;

/** A Project prefix is this many letters, A to Z. */
export const prefixLength = { min: 2, max: 5 } as const;
