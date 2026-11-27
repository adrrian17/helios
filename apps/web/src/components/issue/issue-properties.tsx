import { Button } from "@helios/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@helios/ui/components/tooltip";
import { cn } from "@helios/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";

import {
  MemberAvatar,
  RelativeTime,
  StateIcon,
  UnassignedAvatar,
} from "@/components/issue-meta";
import { assigneeOptions, stateOptions } from "@/components/issue-options";
import { useIssue } from "@/components/issue/use-issue";
import { Picker } from "@/components/picker";
import type { MemberSummary, WorkflowState } from "@/utils/domain";
import { UNASSIGNED } from "@/utils/filters";
import { formatDate } from "@/utils/format";
import { orpc } from "@/utils/orpc";

/** The pickers a keyboard shortcut can open by name (S and A). */
export type IssuePicker = "state" | "assignee";

/** Where the properties show: the desktop rail, or the phone's chip row and the card below the body. */
type Layout = "rail" | "summary" | "details";

// In the chip row the last chip (assignee) takes what is left and truncates; it wraps only below 44px.
const Row = ({
  term,
  chip = false,
  className,
  children,
}: {
  term: string;
  /** A bare value in the phone's chip row; the term is only spoken. */
  chip?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      chip
        ? "flex max-w-full min-w-0 last:min-w-11 last:grow last:basis-0"
        : "flex min-h-8 items-center gap-2",
      className
    )}
  >
    <dt
      className={
        chip ? "sr-only" : "text-muted-foreground w-20 shrink-0 text-xs"
      }
    >
      {term}
    </dt>
    <dd className={cn("flex min-w-0", !chip && "flex-1")}>{children}</dd>
  </div>
);

/** A display name that may be an email: offers a break before the at sign so it wraps there first. */
const Name = ({ name }: { name: string }) => {
  const at = Math.max(name.indexOf("@"), 0);

  return (
    <>
      {name.slice(0, at)}
      <wbr />
      {name.slice(at)}
    </>
  );
};

const AssigneeValue = ({
  assignee,
  wrap,
}: {
  assignee: MemberSummary | null;
  wrap: boolean;
}) => (
  <>
    {assignee === null ? (
      <UnassignedAvatar />
    ) : (
      <MemberAvatar member={assignee} />
    )}
    <span
      className={cn(
        wrap ? "min-w-0 [overflow-wrap:anywhere]" : "truncate",
        assignee === null && "text-muted-foreground"
      )}
    >
      {assignee === null ? (
        "Sin responsable"
      ) : (
        <Name name={assignee.displayName} />
      )}
    </span>
  </>
);

const Opens = () => (
  <ChevronDownIcon
    data-icon="inline-end"
    aria-hidden="true"
    className="text-muted-foreground ml-auto"
  />
);

const IssueMetadata = ({ compact }: { compact: boolean }) => {
  const issue = useIssue();

  if (compact) {
    return (
      <div className="text-muted-foreground pt-1 text-xs text-pretty">
        <dt className="sr-only">Historial</dt>
        <dd>
          Creada por {issue.creator.displayName} el{" "}
          {formatDate(issue.createdAt)} · Actualizada{" "}
          <RelativeTime date={issue.updatedAt} />
        </dd>
      </div>
    );
  }

  return (
    <>
      {/* Read-only history, set apart from the fields a picker edits. */}
      <Row term="Creada por" className="mt-3 border-t pt-3">
        <span className="text-muted-foreground flex min-w-0 items-center gap-2 px-2.5 text-sm">
          <MemberAvatar member={issue.creator} />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            <Name name={issue.creator.displayName} />
          </span>
        </span>
      </Row>
      <Row term="Creada">
        <span className="text-muted-foreground px-2.5 text-sm">
          {formatDate(issue.createdAt)}
        </span>
      </Row>
      <Row term="Actualizada">
        <RelativeTime
          date={issue.updatedAt}
          className="text-muted-foreground px-2.5 text-sm"
        />
      </Row>
    </>
  );
};

/**
 * Workflow State and assignee, each edited through a picker; plus who created
 * it and when. Phones split them: the first two as chips under the title
 * (`summary`), the rest in a card below the body (`details`).
 */
export const IssueProperties = ({
  states,
  openPicker,
  onOpenPickerChange,
  layout,
}: {
  states: WorkflowState[];
  openPicker: IssuePicker | null;
  onOpenPickerChange: (picker: IssuePicker | null) => void;
  layout: Layout;
}) => {
  const issue = useIssue();
  const members = useQuery(orpc.workspace.members.queryOptions());
  const update = useMutation(orpc.issues.update.mutationOptions());

  // Show the value being saved until the refetch brings it back.
  const saving = update.isPending ? update.variables : undefined;

  const state =
    states.find((entry) => entry.id === saving?.stateId) ?? issue.state;

  const assignee =
    saving?.assigneeId === undefined
      ? issue.assignee
      : (members.data?.find((member) => member.id === saving.assigneeId) ??
        null);

  const pickerProps = (picker: IssuePicker) => ({
    open: openPicker === picker,
    onOpenChange: (open: boolean) => {
      onOpenPickerChange(open ? picker : null);
    },
  });

  // Only active Members can be assigned; the current assignee stays listed even if deactivated.
  const assignable = (members.data ?? []).filter(
    (member) => member.active || member.id === issue.assignee?.id
  );

  if (layout === "details") {
    return (
      <dl className="flex flex-col gap-1">
        <IssueMetadata compact />
      </dl>
    );
  }

  const chip = layout === "summary";

  const { variant, width, opens, list } = chip
    ? ({
        variant: "secondary",
        // A chip too long for the row truncates on a line of its own; the rest wrap below it.
        width: "min-w-11 max-w-full shrink",
        opens: null,
        list: "flex flex-wrap gap-1.5",
      } as const)
    : ({
        variant: "property",
        width: "",
        opens: <Opens />,
        list: "flex flex-col gap-1",
      } as const);

  return (
    <dl className={list}>
      <Row term="Estado" chip={chip}>
        <Picker
          label="Mover a"
          {...pickerProps("state")}
          options={stateOptions(states)}
          selected={[state.id]}
          onSelect={(stateId) => {
            update.mutate({ id: issue.id, stateId });
          }}
          trigger={
            <Button
              variant={variant}
              className={width}
              aria-label={`Estado: ${state.name}`}
            >
              <StateIcon category={state.category} />
              <span className="truncate">{state.name}</span>
              {opens}
            </Button>
          }
        />
      </Row>
      <Row term="Responsable" chip={chip}>
        <Tooltip>
          <Picker
            label="Asignar a"
            {...pickerProps("assignee")}
            options={assigneeOptions(assignable)}
            selected={[assignee?.id ?? UNASSIGNED]}
            onSelect={(value) => {
              update.mutate({
                id: issue.id,
                assigneeId: value === UNASSIGNED ? null : value,
              });
            }}
            trigger={
              <TooltipTrigger
                render={
                  <Button
                    variant={variant}
                    className={cn(
                      width,
                      // The rail has room, so an email-only name wraps instead of being cut.
                      !chip && "h-auto min-h-8 text-left whitespace-normal"
                    )}
                    aria-label={`Responsable: ${assignee?.displayName ?? "Sin responsable"}`}
                  />
                }
              >
                <AssigneeValue assignee={assignee} wrap={!chip} />
                {opens}
              </TooltipTrigger>
            }
          />
          {assignee === null ? null : (
            <TooltipContent>{assignee.email}</TooltipContent>
          )}
        </Tooltip>
      </Row>
      {chip ? null : <IssueMetadata compact={false} />}
    </dl>
  );
};
