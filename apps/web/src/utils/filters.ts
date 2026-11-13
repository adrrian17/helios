import { priorities } from "@helios/api/domain";
import type { IssueFilters } from "@helios/api/domain";
import { z } from "zod";

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
  priority: z.array(z.enum(priorities)).optional().catch(undefined),
});

export type FilterSearch = z.infer<typeof filterSearchSchema>;

export const toApiFilters = ({
  assignee,
  label,
  priority,
}: FilterSearch): IssueFilters => {
  const members = assignee?.filter((id) => id !== UNASSIGNED) ?? [];

  return {
    ...(members.length > 0 && { assigneeIds: members }),
    ...(assignee?.includes(UNASSIGNED) === true && { unassigned: true }),
    ...(label !== undefined && label.length > 0 && { labelIds: label }),
    ...(priority !== undefined &&
      priority.length > 0 && { priorities: priority }),
  };
};

export const hasFilters = (search: FilterSearch) =>
  Object.keys(toApiFilters(search)).length > 0;
