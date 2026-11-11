import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@helios/ui/components/button";
import { Input } from "@helios/ui/components/input";
import { Spinner } from "@helios/ui/components/spinner";
import { cn } from "@helios/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { PlusIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";

import { SortableIssueCard } from "@/components/board/issue-card";
import { StateIcon } from "@/components/issue-meta";
import type { BoardColumn, IssueRow, WorkflowState } from "@/utils/domain";
import { orpc } from "@/utils/orpc";

/** Inline title input at the bottom of a column; stays open so several Issues can be added in a row. */
const IssueComposer = ({
  projectId,
  state,
  onClose,
  onCreated,
}: {
  projectId: string;
  state: WorkflowState;
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [title, setTitle] = useState("");
  const create = useMutation(orpc.issues.create.mutationOptions());
  const inputId = `new-issue-${state.id}`;

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();

        const submitted = title.trim();

        if (submitted !== "") {
          // Cleared now, not on success: success lands after the refetch and would wipe text typed meanwhile.
          setTitle("");
          create.mutate(
            { projectId, stateId: state.id, title: submitted },
            {
              onSuccess: onCreated,
              onError: () => {
                setTitle((current) => (current === "" ? submitted : current));
              },
            }
          );
        }
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        New Issue title in {state.name}
      </label>
      <Input
        id={inputId}
        autoFocus
        autoComplete="off"
        maxLength={500}
        placeholder="Issue title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
      />
      <div className="flex items-center gap-1">
        <Button
          type="submit"
          size="sm"
          disabled={create.isPending || title.trim() === ""}
        >
          {create.isPending ? <Spinner data-icon="inline-start" /> : null}
          Add Issue
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Stop adding Issues"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>
    </form>
  );
};

export const BoardColumnView = ({
  column,
  projectId,
  states,
  onMove,
  pickedId,
  onCardKeyDown,
}: {
  column: BoardColumn;
  projectId: string;
  states: WorkflowState[];
  onMove: (issueId: string, stateId: string) => void;
  pickedId: string | null;
  onCardKeyDown: (issue: IssueRow, event: React.KeyboardEvent) => void;
}) => {
  const { state, issues } = column;
  const { setNodeRef, isOver } = useDroppable({ id: state.id });
  const [composing, setComposing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const headingId = `column-${state.id}`;

  return (
    <section
      aria-labelledby={headingId}
      data-state={state.name}
      className="bg-muted/50 dark:bg-muted/30 flex max-h-full w-68 shrink-0 flex-col rounded-xl max-md:h-full max-md:max-h-none max-md:w-full max-md:snap-center max-md:snap-always max-md:rounded-none max-md:bg-transparent"
    >
      <header className="flex h-10 shrink-0 items-center gap-2 pr-1.5 pl-3 max-md:hidden">
        <StateIcon category={state.category} />
        <h2 id={headingId} className="truncate text-sm font-medium">
          {state.name}
        </h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {issues.length}
          <span className="sr-only"> Issues</span>
        </span>
        <span className="flex-1" />
        <Button
          variant="muted"
          size="icon-xs"
          aria-label={`Add Issue to ${state.name}`}
          onClick={() => {
            setComposing(true);
          }}
        >
          <PlusIcon />
        </Button>
      </header>
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto px-1.5 max-md:px-3 max-md:pt-3 max-md:pb-24"
      >
        <SortableContext
          items={issues.map((issue) => issue.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul
            ref={setNodeRef}
            aria-labelledby={headingId}
            className={cn(
              "flex min-h-12 flex-col gap-1.5 rounded-lg pb-1.5 transition-colors",
              isOver && issues.length === 0 && "bg-muted"
            )}
          >
            {issues.map((issue) => (
              <SortableIssueCard
                key={issue.id}
                issue={issue}
                states={states}
                onMove={(stateId) => {
                  onMove(issue.id, stateId);
                }}
                picked={issue.id === pickedId}
                onKeyDown={(event) => {
                  onCardKeyDown(issue, event);
                }}
              />
            ))}
            {issues.length === 0 && !composing ? (
              <li className="text-muted-foreground grid h-12 place-items-center rounded-lg border border-dashed text-xs">
                No Issues
              </li>
            ) : null}
          </ul>
        </SortableContext>
        <div className="pb-1.5">
          {composing ? (
            <IssueComposer
              projectId={projectId}
              state={state}
              onClose={() => {
                setComposing(false);
              }}
              onCreated={() => {
                listRef.current?.scrollTo({
                  top: listRef.current.scrollHeight,
                });
              }}
            />
          ) : (
            <Button
              variant="muted"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setComposing(true);
              }}
            >
              <PlusIcon data-icon="inline-start" />
              Add Issue
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};
