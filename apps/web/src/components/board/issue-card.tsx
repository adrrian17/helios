import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@helios/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@helios/ui/components/dropdown-menu";
import { cn } from "@helios/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRightLeftIcon, ListChecksIcon } from "lucide-react";

import {
  LabelDot,
  MemberAvatar,
  PriorityIcon,
  StateIcon,
  UnassignedAvatar,
} from "@/components/issue-meta";
import { priorityLabels } from "@/utils/domain";
import type { IssueRow, WorkflowState } from "@/utils/domain";

const SORTABLE_MOTION =
  // oxlint-disable-next-line shadcn/no-arbitrary-values -- dnd-kit computes the transition on every drag frame; no token can express it.
  "transform-(--drag-transform) [transition:var(--drag-transition)]";

const CHIP =
  "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-xs leading-none text-muted-foreground";

/** What a card shows; shared by the card in its column and the copy that follows the pointer. */
export const IssueCardBody = ({
  issue,
  className,
}: {
  issue: IssueRow;
  className?: string;
}) => {
  const checklistDone =
    issue.checklist.total > 0 && issue.checklist.done === issue.checklist.total;

  return (
    <div
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-1.5 rounded-lg border p-2.5 shadow-xs",
        className
      )}
    >
      <div className="text-muted-foreground flex h-5 items-center gap-1.5 text-xs max-md:pr-10">
        <PriorityIcon priority={issue.priority} labelled={false} />
        <span className="font-mono tabular-nums">{issue.identifier}</span>
        <span className="flex-1" />
        {issue.assignee === null ? (
          <>
            <UnassignedAvatar />
            <span className="sr-only">Unassigned</span>
          </>
        ) : (
          <>
            <MemberAvatar member={issue.assignee} />
            <span className="sr-only">
              Assigned to {issue.assignee.displayName}
            </span>
          </>
        )}
      </div>
      <p className="line-clamp-3 text-sm leading-snug font-medium text-pretty break-words">
        {issue.title}
      </p>
      <span className="sr-only">
        Priority: {priorityLabels[issue.priority]}
      </span>
      {issue.checklist.total === 0 && issue.labels.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-1">
          {issue.checklist.total > 0 ? (
            <span className={cn(CHIP, checklistDone && "text-state-completed")}>
              <ListChecksIcon className="size-3" aria-hidden="true" />
              <span className="tabular-nums">
                <span className="sr-only">Checklist </span>
                {issue.checklist.done}/{issue.checklist.total}
              </span>
            </span>
          ) : null}
          {issue.labels.map((label) => (
            <span key={label.id} className={cn(CHIP, "max-w-32")}>
              <LabelDot color={label.color} />
              <span className="truncate">{label.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/** The phone's alternative to dragging across columns. */
const MoveToMenu = ({
  issue,
  states,
  onMove,
}: {
  issue: IssueRow;
  states: WorkflowState[];
  onMove: (stateId: string) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button
          variant="muted"
          size="icon-sm"
          aria-label={`Move ${issue.identifier} to`}
          className="absolute top-0.5 right-0.5 md:hidden"
        />
      }
    >
      <ArrowRightLeftIcon />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-48">
      <DropdownMenuGroup>
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        {states.map((state) => (
          <DropdownMenuItem
            key={state.id}
            disabled={state.id === issue.state.id}
            onClick={() => {
              onMove(state.id);
            }}
          >
            <StateIcon category={state.category} />
            {state.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const SortableIssueCard = ({
  issue,
  states,
  onMove,
  picked,
  onKeyDown,
}: {
  issue: IssueRow;
  states: WorkflowState[];
  onMove: (stateId: string) => void;
  /** Picked up with the keyboard and following the arrow keys. */
  picked: boolean;
  onKeyDown: (event: React.KeyboardEvent) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  // The card stays a link to the Issue; the drag instructions it points to describe the rest.
  const dragAttributes = {
    tabIndex: attributes.tabIndex,
    "aria-describedby": attributes["aria-describedby"],
  };

  return (
    <li
      ref={setNodeRef}
      data-issue={issue.identifier}
      data-issue-id={issue.id}
      className={cn("relative", SORTABLE_MOTION)}
      style={{
        "--drag-transform": CSS.Translate.toString(transform) ?? "none",
        "--drag-transition": transition ?? "none",
      }}
    >
      <Link
        to="/issue/$identifier"
        params={{ identifier: issue.identifier }}
        {...dragAttributes}
        {...listeners}
        aria-pressed={picked}
        onKeyDown={onKeyDown}
        className={cn(
          "focus-visible:ring-ring/50 block touch-manipulation rounded-lg outline-none select-none [-webkit-touch-callout:none] focus-visible:ring-3",
          isDragging && "opacity-40",
          picked && "ring-primary ring-offset-background ring-2 ring-offset-2"
        )}
      >
        <IssueCardBody
          issue={issue}
          className="hover:border-foreground/20 transition-colors"
        />
      </Link>
      <MoveToMenu issue={issue} states={states} onMove={onMove} />
    </li>
  );
};
