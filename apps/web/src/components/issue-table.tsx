import { cn } from "@helios/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  SignalIcon,
  UserRoundIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  LabelDot,
  MemberAvatar,
  PriorityIcon,
  RelativeTime,
  StateIcon,
  UnassignedAvatar,
} from "@/components/issue-meta";
import { priorityLabels } from "@/utils/domain";
import type { IssueRow } from "@/utils/domain";
import type { Sort, SortField } from "@/utils/filters";
import { formatDate } from "@/utils/format";

/**
 * Each column's header and the breakpoint it appears from. Phones keep
 * Identifier, title, Priority and assignee, the last two as icons.
 */
const columns: {
  field: SortField;
  label: string;
  /** Shown instead of the label where the column is only an icon wide. */
  icon?: LucideIcon;
  className: string;
}[] = [
  { field: "identifier", label: "ID", className: "w-20 md:w-24" },
  { field: "title", label: "Title", className: "" },
  { field: "state", label: "State", className: "w-36 max-md:hidden" },
  {
    field: "priority",
    label: "Priority",
    icon: SignalIcon,
    className: "w-11 lg:w-28",
  },
  {
    field: "assignee",
    label: "Assignee",
    icon: UserRoundIcon,
    className: "w-11 lg:w-40",
  },
  { field: "created", label: "Created", className: "w-28 max-xl:hidden" },
  { field: "updated", label: "Updated", className: "w-28 max-xl:hidden" },
];

const CELL = "px-2 first:pl-4 last:pr-4";

const ariaSort = { asc: "ascending", desc: "descending" } as const;

const SortHeader = ({
  column,
  sort,
  onSort,
}: {
  column: (typeof columns)[number];
  sort: Sort;
  onSort: (field: SortField) => void;
}) => {
  const active = sort.field === column.field;
  const Arrow = sort.direction === "asc" ? ArrowUpIcon : ArrowDownIcon;
  const Icon = column.icon;

  return (
    <th
      scope="col"
      className={cn(CELL, "h-9 text-left font-normal", column.className)}
      aria-sort={active ? ariaSort[sort.direction] : undefined}
    >
      <button
        type="button"
        className={cn(
          "hover:text-foreground focus-visible:ring-ring/50 -mx-1 inline-flex h-7 max-w-full items-center gap-1 rounded-md px-1 text-xs outline-none focus-visible:ring-3 max-md:h-11",
          active ? "text-foreground" : "text-muted-foreground"
        )}
        onClick={() => {
          onSort(column.field);
        }}
      >
        {Icon === undefined ? null : (
          <Icon aria-hidden="true" className="size-3.5 lg:hidden" />
        )}
        <span
          className={cn("truncate", Icon !== undefined && "max-lg:sr-only")}
        >
          {column.label}
        </span>
        {active ? <Arrow aria-hidden="true" className="size-3" /> : null}
      </button>
    </th>
  );
};

const MAX_LABELS = 3;

const IssueTableRow = ({ issue }: { issue: IssueRow }) => (
  <tr
    data-issue={issue.identifier}
    className="hover:bg-muted/50 has-focus-visible:bg-muted/50 relative h-10 border-b transition-colors max-md:h-12"
  >
    <td
      className={cn(
        CELL,
        "text-muted-foreground font-mono text-xs tabular-nums"
      )}
    >
      {issue.identifier}
    </td>
    {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- the cell's text is the title inside the row's link, deeper than the rule looks. */}
    <td className={CELL}>
      <span className="flex min-w-0 items-center gap-2">
        <Link
          to="/issue/$identifier"
          params={{ identifier: issue.identifier }}
          className="focus-visible:after:ring-ring/50 min-w-0 truncate font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset"
        >
          {issue.title}
        </Link>
        <span className="flex shrink-0 items-center gap-1 max-xl:hidden">
          {issue.labels.slice(0, MAX_LABELS).map((label) => (
            <span
              key={label.id}
              className="text-muted-foreground inline-flex h-5 max-w-28 items-center gap-1 rounded-md border px-1.5 text-xs"
            >
              <LabelDot color={label.color} />
              <span className="truncate">{label.name}</span>
            </span>
          ))}
          {issue.labels.length > MAX_LABELS ? (
            <span className="text-muted-foreground text-xs">
              +{issue.labels.length - MAX_LABELS}
            </span>
          ) : null}
        </span>
      </span>
    </td>
    <td className={cn(CELL, "max-md:hidden")}>
      <span className="flex min-w-0 items-center gap-2">
        <StateIcon category={issue.state.category} />
        <span className="truncate">{issue.state.name}</span>
      </span>
    </td>
    <td className={CELL}>
      <span className="flex min-w-0 items-center gap-2">
        <PriorityIcon priority={issue.priority} labelled={false} />
        <span className="text-muted-foreground truncate max-lg:sr-only">
          {priorityLabels[issue.priority]}
        </span>
      </span>
    </td>
    <td className={CELL}>
      <span className="flex min-w-0 items-center gap-2">
        {issue.assignee === null ? (
          <UnassignedAvatar />
        ) : (
          <MemberAvatar member={issue.assignee} />
        )}
        <span
          className={cn(
            "truncate max-lg:sr-only",
            issue.assignee === null && "text-muted-foreground"
          )}
        >
          {issue.assignee?.displayName ?? "Unassigned"}
        </span>
      </span>
    </td>
    <td className={cn(CELL, "text-muted-foreground max-xl:hidden")}>
      {formatDate(issue.createdAt)}
    </td>
    <td className={cn(CELL, "text-muted-foreground max-xl:hidden")}>
      <RelativeTime date={issue.updatedAt} />
    </td>
  </tr>
);

/** One dense row per Issue, sorted by the column header last chosen. */
export const IssueTable = ({
  label,
  issues,
  sort,
  onSort,
}: {
  label: string;
  issues: IssueRow[];
  sort: Sort;
  onSort: (field: SortField) => void;
}) => (
  <table aria-label={label} className="w-full table-fixed text-sm">
    <thead className="border-b">
      <tr>
        {columns.map((column) => (
          <SortHeader
            key={column.field}
            column={column}
            sort={sort}
            onSort={onSort}
          />
        ))}
      </tr>
    </thead>
    <tbody>
      {issues.map((issue) => (
        <IssueTableRow key={issue.id} issue={issue} />
      ))}
    </tbody>
  </table>
);
