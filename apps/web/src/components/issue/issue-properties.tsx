import { Button } from "@helios/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@helios/ui/components/tooltip";
import { cn } from "@helios/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, PlusIcon } from "lucide-react";

import {
  LabelDot,
  MemberAvatar,
  PriorityIcon,
  RelativeTime,
  StateIcon,
  UnassignedAvatar,
} from "@/components/issue-meta";
import {
  assigneeOptions,
  labelOptions,
  priorityOptions,
  stateOptions,
} from "@/components/issue-options";
import { useIssue, useIssueCache } from "@/components/issue/use-issue";
import { Picker } from "@/components/picker";
import { labelColors, pickerPriorities, priorityLabels } from "@/utils/domain";
import type { Label, MemberSummary, WorkflowState } from "@/utils/domain";
import { UNASSIGNED } from "@/utils/filters";
import { formatDate } from "@/utils/format";
import { orpc } from "@/utils/orpc";

/** The pickers a keyboard shortcut can open by name (S, P, A, and one for Labels). */
export type IssuePicker = "state" | "priority" | "assignee" | "labels";

/** Where the properties show: the desktop rail, or the phone's chip row and the card below the body. */
type Layout = "rail" | "summary" | "details";

const Row = ({
  term,
  chip = false,
  children,
}: {
  term: string;
  /** A bare value in the phone's chip row; the term is only spoken. */
  chip?: boolean;
  children: React.ReactNode;
}) => (
  <div
    className={
      chip ? "flex max-w-full min-w-0" : "flex min-h-8 items-center gap-2"
    }
  >
    <dt
      className={
        chip ? "sr-only" : "text-muted-foreground w-24 shrink-0 text-xs"
      }
    >
      {term}
    </dt>
    <dd className={cn("flex min-w-0", !chip && "flex-1")}>{children}</dd>
  </div>
);

/** The assignee's avatar and name inside its picker button. */
const AssigneeValue = ({ assignee }: { assignee: MemberSummary | null }) => (
  <>
    {assignee === null ? (
      <UnassignedAvatar />
    ) : (
      <MemberAvatar member={assignee} />
    )}
    <span
      className={cn("truncate", assignee === null && "text-muted-foreground")}
    >
      {assignee?.displayName ?? "Unassigned"}
    </span>
  </>
);

/** Marks a property value as a control that opens a picker. */
const Opens = () => (
  <ChevronDownIcon
    data-icon="inline-end"
    aria-hidden="true"
    className="text-muted-foreground ml-auto"
  />
);

const byName = (a: Label, b: Label) => a.name.localeCompare(b.name);

/** Attach and detach show at once; the cached Issue is patched and reloaded if the server refuses. */
const useLabelWrites = (all: Label[]) => {
  const { patch, revert } = useIssueCache();

  const attach = useMutation({
    ...orpc.labels.attach.mutationOptions(),
    onMutate: ({ labelId }) => {
      const label = all.find((entry) => entry.id === labelId);

      if (label !== undefined) {
        patch((issue) => ({
          ...issue,
          labels: [
            ...issue.labels.filter((entry) => entry.id !== labelId),
            label,
          ].toSorted(byName),
        }));
      }
    },
    onError: revert,
  });

  const detach = useMutation({
    ...orpc.labels.detach.mutationOptions(),
    onMutate: ({ labelId }) => {
      patch((issue) => ({
        ...issue,
        labels: issue.labels.filter((entry) => entry.id !== labelId),
      }));
    },
    onError: revert,
  });

  return { attach: attach.mutate, detach: detach.mutate };
};

const LabelsField = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const issue = useIssue();
  const labels = useQuery(orpc.labels.list.queryOptions());
  const all = labels.data ?? issue.labels;
  const { attach, detach } = useLabelWrites(all);
  const attached = new Set(issue.labels.map((label) => label.id));

  const create = useMutation({
    ...orpc.labels.create.mutationOptions(),
    onSuccess: (label) => {
      attach({ issueId: issue.id, labelId: label.id });
    },
  });

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 pl-2.5">
      {issue.labels.map((label) => (
        <span
          key={label.id}
          className="inline-flex h-6 max-w-40 items-center gap-1.5 rounded-md border px-2 text-xs"
        >
          <LabelDot color={label.color} />
          <span className="truncate">{label.name}</span>
        </span>
      ))}
      <Picker
        label="Change Labels"
        multiple
        open={open}
        onOpenChange={onOpenChange}
        options={labelOptions(all)}
        selected={[...attached]}
        onSelect={(labelId) => {
          const link = { issueId: issue.id, labelId };

          if (attached.has(labelId)) {
            detach(link);
          } else {
            attach(link);
          }
        }}
        onCreate={{
          noun: "Label",
          create: (name) => {
            // Each new Label takes the next preset colour, so neighbours differ.
            const color =
              labelColors[all.length % labelColors.length] ?? labelColors[0];

            create.mutate({ name, color: color.value });
          },
        }}
        trigger={
          issue.labels.length === 0 ? (
            <Button variant="property">
              <PlusIcon data-icon="inline-start" />
              <span className="text-muted-foreground">Add Label</span>
            </Button>
          ) : (
            <Button variant="muted" size="icon-xs" aria-label="Change Labels">
              <PlusIcon />
            </Button>
          )
        }
      />
    </div>
  );
};

/** Who created the Issue and when; one muted line in the narrow layout. */
const IssueMetadata = ({ compact }: { compact: boolean }) => {
  const issue = useIssue();

  if (compact) {
    return (
      <div className="text-muted-foreground pt-1 text-xs text-pretty">
        <dt className="sr-only">History</dt>
        <dd>
          Created by {issue.creator.displayName} on{" "}
          {formatDate(issue.createdAt)} · Updated{" "}
          <RelativeTime date={issue.updatedAt} />
        </dd>
      </div>
    );
  }

  return (
    <>
      <Row term="Created by">
        <span className="flex min-w-0 items-center gap-2 px-2.5 text-sm">
          <MemberAvatar member={issue.creator} />
          <span className="truncate">{issue.creator.displayName}</span>
        </span>
      </Row>
      <Row term="Created">
        <span className="px-2.5 text-sm">{formatDate(issue.createdAt)}</span>
      </Row>
      <Row term="Updated">
        <RelativeTime date={issue.updatedAt} className="px-2.5 text-sm" />
      </Row>
    </>
  );
};

/**
 * Workflow State, Priority, assignee and Labels, each edited through a picker;
 * plus who created it and when. Phones split them: the first three as chips
 * under the title (`summary`), the rest in a card below the body (`details`).
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
  const priority = saving?.priority ?? issue.priority;

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

  const details = (
    <>
      <Row term="Labels">
        <LabelsField {...pickerProps("labels")} />
      </Row>
      <IssueMetadata compact={layout === "details"} />
    </>
  );

  if (layout === "details") {
    return <dl className="flex flex-col gap-1">{details}</dl>;
  }

  const chip = layout === "summary";

  const { variant, width, opens, list } = chip
    ? ({
        variant: "outline",
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
      <Row term="Workflow State" chip={chip}>
        <Picker
          label="Move to"
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
              aria-label={`Workflow State: ${state.name}`}
            >
              <StateIcon category={state.category} />
              <span className="truncate">{state.name}</span>
              {opens}
            </Button>
          }
        />
      </Row>
      <Row term="Priority" chip={chip}>
        <Picker
          label="Change Priority"
          {...pickerProps("priority")}
          options={priorityOptions}
          selected={[priority]}
          onSelect={(value) => {
            const chosen = pickerPriorities.find((entry) => entry === value);

            if (chosen !== undefined) {
              update.mutate({ id: issue.id, priority: chosen });
            }
          }}
          trigger={
            <Button
              variant={variant}
              className={width}
              aria-label={`Priority: ${priorityLabels[priority]}`}
            >
              <PriorityIcon priority={priority} labelled={false} />
              <span className="truncate">{priorityLabels[priority]}</span>
              {opens}
            </Button>
          }
        />
      </Row>
      <Row term="Assignee" chip={chip}>
        <Tooltip>
          <Picker
            label="Assign to"
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
                    className={width}
                    aria-label={`Assignee: ${assignee?.displayName ?? "Unassigned"}`}
                  />
                }
              >
                <AssigneeValue assignee={assignee} />
                {opens}
              </TooltipTrigger>
            }
          />
          {assignee === null ? null : (
            <TooltipContent>{assignee.email}</TooltipContent>
          )}
        </Tooltip>
      </Row>
      {chip ? null : details}
    </dl>
  );
};
