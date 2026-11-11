import { Button } from "@helios/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@helios/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@helios/ui/components/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@helios/ui/components/field";
import { Input } from "@helios/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@helios/ui/components/select";
import { Spinner } from "@helios/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";

import { StateIcon } from "@/components/issue-meta";
import { categories } from "@/utils/domain";
import type { Project, StateCategory, WorkflowState } from "@/utils/domain";
import { describeError, orpc } from "@/utils/orpc";

const categoryHints: Record<StateCategory, string> = {
  ideas: "Not committed to; may never be done.",
  backlog: "Accepted, not yet started. New Issues land in the first one.",
  started: "Being worked on.",
  completed: "Done.",
  cancelled: "Will not be done.",
};

/** A single-field inline form used to add or rename a Workflow State. */
const StateNameForm = ({
  label,
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial: string;
  submitLabel: string;
  pending: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial);

  return (
    <form
      className="flex flex-1 items-center gap-1.5 max-sm:flex-wrap"
      onSubmit={(event) => {
        event.preventDefault();

        if (name.trim() !== "") {
          onSubmit(name.trim());
        }
      }}
    >
      <Input
        aria-label={label}
        autoFocus
        autoComplete="off"
        maxLength={120}
        className="min-w-0 flex-1"
        // The form closes on success, so nothing typed after submitting may be lost.
        readOnly={pending}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
        }}
      />
      <Button type="submit" size="sm" disabled={pending || name.trim() === ""}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {submitLabel}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
};

const DeleteStateDialog = ({
  state,
  states,
  onClose,
}: {
  state: WorkflowState | null;
  states: WorkflowState[];
  onClose: () => void;
}) => {
  const others = states.filter((entry) => entry.id !== state?.id);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const chosen = destinationId ?? others[0]?.id ?? null;

  const remove = useMutation({
    ...orpc.workflowStates.delete.mutationOptions(),
    meta: { inlineError: true },
    onSuccess: onClose,
  });

  const items = others.map((entry) => ({ value: entry.id, label: entry.name }));

  return (
    <Dialog
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {state?.name}?</DialogTitle>
          <DialogDescription>
            Its Issues move to the end of the Workflow State you choose, and
            each move is recorded in their Activity.
          </DialogDescription>
        </DialogHeader>
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();

            if (state !== null && chosen !== null) {
              remove.mutate({ id: state.id, destinationId: chosen });
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="destination-state">
                Move its Issues to
              </FieldLabel>
              <Select
                items={items}
                value={chosen}
                onValueChange={(value) => {
                  setDestinationId(value);
                  remove.reset();
                }}
              >
                <SelectTrigger id="destination-state" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {others.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        <StateIcon category={entry.category} />
                        {entry.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {remove.error === null ? null : (
              <p role="alert" className="text-destructive text-sm">
                {describeError(remove.error)}
              </p>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={remove.isPending || chosen === null}
            >
              {remove.isPending ? <Spinner data-icon="inline-start" /> : null}
              Delete Workflow State
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const StateRow = ({
  state,
  above,
  below,
  onDelete,
}: {
  state: WorkflowState;
  /** The neighbours in the same State Category; reordering never crosses categories. */
  above: WorkflowState[];
  below: WorkflowState | undefined;
  onDelete: () => void;
}) => {
  const [renaming, setRenaming] = useState(false);

  const rename = useMutation({
    ...orpc.workflowStates.rename.mutationOptions(),
    onSuccess: () => {
      setRenaming(false);
    },
  });

  const move = useMutation(orpc.workflowStates.move.mutationOptions());

  return (
    <li
      className="flex min-h-12 items-center gap-2 py-1.5 pr-1.5 pl-4"
      data-workflow-state={state.name}
    >
      <StateIcon category={state.category} />
      {renaming ? (
        <StateNameForm
          label={`New name for ${state.name}`}
          initial={state.name}
          submitLabel="Save"
          pending={rename.isPending}
          onSubmit={(name) => {
            rename.mutate({ id: state.id, name });
          }}
          onCancel={() => {
            setRenaming(false);
          }}
        />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-sm">{state.name}</span>
          {/* A lone state in its category has nowhere to move. */}
          {above.length === 0 && below === undefined ? null : (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${state.name} up`}
                disabled={above.length === 0 || move.isPending}
                onClick={() => {
                  move.mutate({
                    id: state.id,
                    afterId: above.at(-2)?.id ?? null,
                  });
                }}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${state.name} down`}
                disabled={below === undefined || move.isPending}
                onClick={() => {
                  if (below !== undefined) {
                    move.mutate({ id: state.id, afterId: below.id });
                  }
                }}
              >
                <ArrowDownIcon />
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`More actions for ${state.name}`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => {
                    setRenaming(true);
                  }}
                >
                  <PencilIcon />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <TrashIcon />
                  Delete…
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </li>
  );
};

const CategoryGroup = ({
  projectId,
  category,
  label,
  states,
  onDelete,
}: {
  projectId: string;
  category: StateCategory;
  label: string;
  states: WorkflowState[];
  onDelete: (state: WorkflowState) => void;
}) => {
  const [adding, setAdding] = useState(false);

  const add = useMutation({
    ...orpc.workflowStates.add.mutationOptions(),
    onSuccess: () => {
      setAdding(false);
    },
  });

  return (
    <li className="flex flex-col" data-category={category}>
      <div className="bg-muted/40 flex items-center gap-2 py-1.5 pr-1.5 pl-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-xs font-medium tracking-wide uppercase">
            {label}
          </h3>
          <p className="text-muted-foreground text-xs md:truncate">
            {categoryHints[category]}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Add a Workflow State to ${label}`}
          onClick={() => {
            setAdding(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Add
        </Button>
      </div>
      <ul className="divide-y border-t">
        {states.map((state, index) => (
          <StateRow
            key={state.id}
            state={state}
            above={states.slice(0, index)}
            below={states[index + 1]}
            onDelete={() => {
              onDelete(state);
            }}
          />
        ))}
        {adding ? (
          <li className="flex min-h-12 items-center gap-2 py-1.5 pr-1.5 pl-4">
            <StateIcon category={category} />
            <StateNameForm
              label={`Name of the new ${label} Workflow State`}
              initial=""
              submitLabel="Add"
              pending={add.isPending}
              onSubmit={(name) => {
                add.mutate({ projectId, name, category });
              }}
              onCancel={() => {
                setAdding(false);
              }}
            />
          </li>
        ) : null}
        {states.length === 0 && !adding ? (
          <li className="text-muted-foreground py-3 pl-4 text-sm">
            No Workflow States in {label}.
          </li>
        ) : null}
      </ul>
    </li>
  );
};

/** Workflow States grouped by State Category, in board column order. */
export const WorkflowStatesEditor = ({ project }: { project: Project }) => {
  const [deleting, setDeleting] = useState<WorkflowState | null>(null);

  return (
    <>
      <ul
        aria-label="Workflow States by State Category"
        className="bg-card divide-y overflow-hidden rounded-lg border"
      >
        {categories.map(({ value, label }) => (
          <CategoryGroup
            key={value}
            projectId={project.id}
            category={value}
            label={label}
            states={project.states.filter((state) => state.category === value)}
            onDelete={setDeleting}
          />
        ))}
      </ul>
      <DeleteStateDialog
        // A fresh dialog per state, so the chosen destination never carries over.
        key={deleting?.id ?? "closed"}
        state={deleting}
        states={project.states}
        onClose={() => {
          setDeleting(null);
        }}
      />
    </>
  );
};
