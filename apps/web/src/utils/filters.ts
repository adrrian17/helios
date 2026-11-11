import { z } from "zod";

import { pickerPriorities } from "./domain";

/** Assignee token for "no assignee", so unassigned Issues can be filtered like a Member. */
export const UNASSIGNED = "none";

const ids = z.array(z.string()).optional().catch(undefined);

/**
 * Board and List filters as URL search params, so a filtered view can be
 * shared. Values within one filter match any; filters combine with AND.
 */
export const filterSearchSchema = z.object({
  assignee: ids,
  label: ids,
  priority: z.array(z.enum(pickerPriorities)).optional().catch(undefined),
});

export type FilterSearch = z.infer<typeof filterSearchSchema>;

/** Only the filter keys of a search, for links that carry filters across views. */
export const filtersOf = ({ assignee, label, priority }: FilterSearch) => ({
  assignee,
  label,
  priority,
});

export const hasFilters = (search: FilterSearch) =>
  [search.assignee, search.label, search.priority].some(
    (values) => values !== undefined && values.length > 0
  );

/** The `filters` input of `issues.board` and `issues.list`. */
export const toApiFilters = ({ assignee, label, priority }: FilterSearch) => {
  const members = assignee?.filter((id) => id !== UNASSIGNED) ?? [];

  return {
    ...(members.length > 0 && { assigneeIds: members }),
    ...(assignee?.includes(UNASSIGNED) === true && { unassigned: true }),
    ...(label !== undefined && label.length > 0 && { labelIds: label }),
    ...(priority !== undefined &&
      priority.length > 0 && { priorities: priority }),
  };
};

export const sortFields = [
  "identifier",
  "title",
  "state",
  "priority",
  "assignee",
  "created",
  "updated",
] as const;

export type SortField = (typeof sortFields)[number];

/** How the List orders its rows; it never changes the Board's manual order. */
export interface Sort {
  field: SortField;
  direction: "asc" | "desc";
}
