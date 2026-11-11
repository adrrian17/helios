import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@helios/ui/components/button";
import { Checkbox } from "@helios/ui/components/checkbox";
import { Input } from "@helios/ui/components/input";
import { cn } from "@helios/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { GripVerticalIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { useIssue, useIssueCache } from "@/components/issue/use-issue";
import type { IssueDetail } from "@/utils/domain";
import { orpc } from "@/utils/orpc";

type Item = IssueDetail["checklist"][number];

const SORTABLE_MOTION =
  // oxlint-disable-next-line shadcn/no-arbitrary-values -- dnd-kit computes the transition on every drag frame; no token can express it.
  "transform-(--drag-transform) [transition:var(--drag-transition)]";

const TEXT_LIMIT = 500;

const useChecklistWrites = () => {
  const { patch, revert } = useIssueCache();

  const editItems = (change: (items: Item[]) => Item[]) => {
    patch((issue) => ({ ...issue, checklist: change(issue.checklist) }));
  };

  const update = useMutation({
    ...orpc.checklist.update.mutationOptions(),
    onMutate: ({ id, ...changes }) => {
      editItems((items) =>
        items.map((item) => (item.id === id ? { ...item, ...changes } : item))
      );
    },
    onError: revert,
  });

  const move = useMutation({
    ...orpc.checklist.move.mutationOptions(),
    onError: revert,
  });

  const remove = useMutation({
    ...orpc.checklist.delete.mutationOptions(),
    onMutate: ({ id }) => {
      editItems((items) => items.filter((item) => item.id !== id));
    },
    onError: revert,
  });

  return { editItems, update, move, remove };
};

const ItemRow = ({
  item,
  writes,
}: {
  item: Item;
  writes: ReturnType<typeof useChecklistWrites>;
}) => {
  const [editing, setEditing] = useState<string | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const save = () => {
    const text = editing?.trim() ?? "";

    if (text !== "" && text !== item.text) {
      writes.update.mutate({ id: item.id, text });
    }

    setEditing(null);
  };

  return (
    <li
      ref={setNodeRef}
      data-checklist-item={item.text}
      className={cn(
        "group/item bg-background relative flex min-h-9 items-center gap-1 rounded-md pr-1 max-md:min-h-11 max-md:gap-3",
        SORTABLE_MOTION,
        isDragging && "ring-foreground/10 z-10 shadow-md ring-1"
      )}
      style={{
        "--drag-transform": CSS.Translate.toString(transform) ?? "none",
        "--drag-transition": transition ?? "none",
      }}
    >
      <span className="cursor-grab touch-none md:absolute md:-left-7 md:opacity-0 md:group-hover/item:opacity-100 md:focus-within:opacity-100">
        <Button
          ref={setActivatorNodeRef}
          variant="muted"
          size="icon-xs"
          aria-label={`Reorder ${item.text}`}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon />
        </Button>
      </span>
      <Checkbox
        aria-label={item.text}
        checked={item.checked}
        onCheckedChange={(checked) => {
          writes.update.mutate({ id: item.id, checked });
        }}
      />
      {editing === null ? (
        <button
          type="button"
          className={cn(
            "focus-visible:ring-ring min-w-0 flex-1 cursor-text truncate rounded-sm px-2 py-1 text-left text-sm outline-none focus-visible:ring-3 max-md:min-h-11",
            item.checked && "text-muted-foreground line-through"
          )}
          onClick={() => {
            setEditing(item.text);
          }}
        >
          {item.text}
        </button>
      ) : (
        <Input
          aria-label={`Edit ${item.text}`}
          autoFocus
          maxLength={TEXT_LIMIT}
          className="h-7 flex-1"
          value={editing}
          onChange={(event) => {
            setEditing(event.target.value);
          }}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setEditing(null);
            }
          }}
        />
      )}
      <span className="md:opacity-0 md:group-hover/item:opacity-100 md:focus-within:opacity-100">
        <Button
          variant="muted"
          size="icon-xs"
          aria-label={`Delete ${item.text}`}
          onClick={() => {
            writes.remove.mutate({ id: item.id });
          }}
        >
          <XIcon />
        </Button>
      </span>
    </li>
  );
};

const AddItem = ({ issueId }: { issueId: string }) => {
  const [text, setText] = useState("");
  const add = useMutation(orpc.checklist.add.mutationOptions());

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault();

        if (text.trim() !== "" && !add.isPending) {
          add.mutate(
            { issueId, text: text.trim() },
            {
              onSuccess: () => {
                setText("");
              },
            }
          );
        }
      }}
    >
      <PlusIcon
        aria-hidden="true"
        className="text-muted-foreground size-4 shrink-0"
      />
      <Input
        aria-label="New Checklist item"
        placeholder="Add an item"
        autoComplete="off"
        maxLength={TEXT_LIMIT}
        className="h-8"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
    </form>
  );
};

export const IssueChecklist = () => {
  const issue = useIssue();
  const writes = useChecklistWrites();
  const items = issue.checklist;
  const done = items.filter((item) => item.checked).length;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over?.id);

    if (from === -1 || to === -1 || from === to) {
      return;
    }

    const next = arrayMove(items, from, to);
    writes.editItems(() => next);
    writes.move.mutate({
      id: String(active.id),
      afterId: next[to - 1]?.id ?? null,
    });
  };

  return (
    <section
      aria-labelledby="checklist-heading"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-3">
        <h2 id="checklist-heading" className="text-sm font-medium">
          Checklist
        </h2>
        {items.length === 0 ? null : (
          <>
            <span className="text-muted-foreground text-xs tabular-nums">
              {done}/{items.length}
              <span className="sr-only"> done</span>
            </span>
            <span
              aria-hidden="true"
              className="bg-muted h-1 max-w-32 flex-1 overflow-hidden rounded-full"
            >
              <span
                className="bg-state-completed block h-full w-full origin-left scale-x-(--progress) rounded-full transition-transform"
                style={{ "--progress": done / items.length }}
              />
            </span>
          </>
        )}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul aria-label="Checklist" className="flex flex-col">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} writes={writes} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <AddItem issueId={issue.id} />
    </section>
  );
};
