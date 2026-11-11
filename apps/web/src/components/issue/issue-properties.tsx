import { Button } from "@helios/ui/components/button";
import { cn } from "@helios/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";

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
import type { Label, WorkflowState } from "@/utils/domain";
import { UNASSIGNED } from "@/utils/filters";
import { formatDate } from "@/utils/format";
import { orpc } from "@/utils/orpc";

/** The pickers a keyboard shortcut can open by name (S, P, A, and one for Labels). */
export type IssuePicker = "state" | "priority" | "assignee" | "labels";

const Row = ({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) => (
  <div className="flex min-h-8 items-center gap-2">
    <dt className="text-muted-foreground w-24 shrink-0 text-xs">{term}</dt>
    <dd className="flex min-w-0 flex-1">{children}</dd>
  </div>
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
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 pl-1">
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
      <div className="text-muted-foreground px-2.5 pt-1 text-xs text-pretty">
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

/** Workflow State, Priority, assignee and Labels, each edited through a picker; plus who created it and when. */
export const IssueProperties = ({
  states,
  openPicker,
  onOpenPickerChange,
  compact = false,
}: {
  states: WorkflowState[];
  openPicker: IssuePicker | null;
  onOpenPickerChange: (picker: IssuePicker | null) => void;
  /** Folds who created it and when into one line, for the narrow layout. */
  compact?: boolean;
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

  return (
    <dl className="flex flex-col gap-1">
      <Row term="Workflow State">
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
              variant="property"
              aria-label={`Workflow State: ${state.name}`}
            >
              <StateIcon category={state.category} />
              <span className="truncate">{state.name}</span>
            </Button>
          }
        />
      </Row>
      <Row term="Priority">
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
              variant="property"
              aria-label={`Priority: ${priorityLabels[priority]}`}
            >
              <PriorityIcon priority={priority} labelled={false} />
              <span className="truncate">{priorityLabels[priority]}</span>
            </Button>
          }
        />
      </Row>
      <Row term="Assignee">
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
            <Button
              variant="property"
              aria-label={`Assignee: ${assignee?.displayName ?? "Unassigned"}`}
            >
              {assignee === null ? (
                <UnassignedAvatar />
              ) : (
                <MemberAvatar member={assignee} />
              )}
              <span
                className={cn(
                  "truncate",
                  assignee === null && "text-muted-foreground"
                )}
              >
                {assignee?.displayName ?? "Unassigned"}
              </span>
            </Button>
          }
        />
      </Row>
      <Row term="Labels">
        <LabelsField {...pickerProps("labels")} />
      </Row>
      <IssueMetadata compact={compact} />
    </dl>
  );
};
