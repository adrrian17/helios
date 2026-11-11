import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Announcements,
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useIsMobile } from "@helios/ui/hooks/use-mobile";
import { cn } from "@helios/ui/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { BoardColumnView } from "@/components/board/board-column";
import {
  changedPlacement,
  columnOf,
  describePosition,
  locate,
  moveIssue,
} from "@/components/board/board-model";
import type { Placement } from "@/components/board/board-model";
import { ColumnPager } from "@/components/board/column-pager";
import { IssueCardBody } from "@/components/board/issue-card";
import { useKeyboardMoves } from "@/components/board/use-keyboard-moves";
import type { BoardColumn, IssueRow, Project } from "@/utils/domain";
import type { toApiFilters } from "@/utils/filters";
import { orpc } from "@/utils/orpc";

const screenReaderInstructions = {
  draggable:
    "Press Enter to open the Issue. To move it, press Space, use the arrow keys to move it within its column or to another column, then press Space to drop it or Escape to cancel.",
};

const CLICK_GUARD_MS = 150;

/** Server columns plus optimistic moves through `issues.move`, snapping back when the server refuses. */
const useBoardMoves = (input: BoardInput) => {
  const queryClient = useQueryClient();
  const boardKey = orpc.issues.board.queryKey({ input });

  const move = useMutation({
    ...orpc.issues.move.mutationOptions(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: boardKey });
    },
  });

  return (next: BoardColumn[], placement: Placement) => {
    const before = queryClient.getQueryData<BoardColumn[]>(boardKey);
    queryClient.setQueryData(boardKey, next);
    move.mutate(placement, {
      onError: () => {
        // Snap back, then reload: a CONFLICT means someone else changed the board.
        queryClient.setQueryData(boardKey, before);
        void queryClient.invalidateQueries({ queryKey: boardKey });
      },
    });
  };
};

const overflowsRight = (scroller: HTMLElement) =>
  scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1;

/** What the board was loaded with; moves edit that cached board. */
export interface BoardInput {
  projectId: string;
  filters: ReturnType<typeof toApiFilters>;
}

export const Board = ({
  project,
  input,
  columns,
}: {
  project: Project;
  input: BoardInput;
  columns: BoardColumn[];
}) => {
  const isMobile = useIsMobile();
  const commit = useBoardMoves(input);

  // While a card is moving, the board renders this working copy instead of the server's columns.
  const [working, setWorking] = useState<BoardColumn[] | null>(null);
  const [activeIssue, setActiveIssue] = useState<IssueRow | null>(null);
  const shown = working ?? columns;
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const justMovedColumn = useRef(false);
  const dragEndedAt = useRef(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [currentColumn, setCurrentColumn] = useState(0);
  // Set while the pager's smooth scroll runs, so taps in a row step from where it is heading.
  const pagingTo = useRef<number | null>(null);
  // Whether columns continue past the right edge, which fades it as a hint to scroll.
  const [moreRight, setMoreRight] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;

    const observer = new ResizeObserver(() => {
      if (scroller !== null) {
        setMoreRight(overflowsRight(scroller));
      }
    });

    if (scroller !== null) {
      observer.observe(scroller);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const keyboard = useKeyboardMoves({
    columns,
    working,
    setWorking,
    commit,
    scroller: scrollerRef,
  });

  const moveToState = (issueId: string, stateId: string) => {
    const toColumn = columns.findIndex((column) => column.state.id === stateId);
    const target = columns[toColumn];

    if (target !== undefined) {
      commit(moveIssue(columns, issueId, toColumn, target.issues.length), {
        id: issueId,
        stateId,
        afterId: target.issues.at(-1)?.id ?? null,
      });
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    })
  );

  // Pointer first, then the closest card inside the column under it; holds still right after a column change to avoid flicker.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args);
    let overId = getFirstCollision(hits, "id");

    if (overId !== null) {
      const column = shown.find((entry) => entry.state.id === overId);

      if (column !== undefined && column.issues.length > 0) {
        const ids = new Set<UniqueIdentifier>(
          column.issues.map((issue) => issue.id)
        );

        overId =
          closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter((container) =>
              ids.has(container.id)
            ),
          })[0]?.id ?? overId;
      }

      lastOverId.current = overId;

      return [{ id: overId }];
    }

    if (justMovedColumn.current) {
      lastOverId.current = args.active.id;
    }

    return lastOverId.current === null ? [] : [{ id: lastOverId.current }];
  };

  const identifierOf = (id: UniqueIdentifier) =>
    locate(shown, String(id)).issue?.identifier ?? "The Issue";

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${identifierOf(active.id)}.`,
    onDragOver: ({ active }) =>
      `${identifierOf(active.id)} is ${describePosition(shown, String(active.id))}.`,
    onDragEnd: ({ active }) =>
      `Dropped ${identifierOf(active.id)} ${describePosition(shown, String(active.id))}.`,
    onDragCancel: ({ active }) =>
      `Cancelled. ${identifierOf(active.id)} went back to where it was.`,
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setWorking(columns);
    setActiveIssue(locate(columns, String(active.id)).issue ?? null);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (over === null || working === null) {
      return;
    }

    const id = String(active.id);
    const from = columnOf(working, id);
    const to = columnOf(working, String(over.id));
    const target = working[to];

    // On phones a drag only reorders inside the visible column; "Move to" changes columns.
    if (from === to || target === undefined || from === -1 || isMobile) {
      return;
    }

    const overIndex = target.issues.findIndex((issue) => issue.id === over.id);
    const activeTop = active.rect.current.translated?.top ?? 0;
    const below = activeTop > over.rect.top + over.rect.height / 2;
    const offset = below ? 1 : 0;

    const toIndex =
      overIndex === -1 ? target.issues.length : overIndex + offset;

    justMovedColumn.current = true;
    requestAnimationFrame(() => {
      justMovedColumn.current = false;
    });
    setWorking(moveIssue(working, id, to, toIndex));
  };

  const finish = () => {
    setWorking(null);
    setActiveIssue(null);
    lastOverId.current = null;
    dragEndedAt.current = Date.now();
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = working;
    finish();

    if (over === null || current === null) {
      return;
    }

    const id = String(active.id);
    const columnIndex = columnOf(current, id);
    const { column, index: from } = locate(current, id);

    const overIndex =
      column?.issues.findIndex((issue) => issue.id === over.id) ?? -1;

    const next =
      overIndex === -1 || overIndex === from
        ? current
        : current.map((entry, index) =>
            index === columnIndex
              ? { ...entry, issues: arrayMove(entry.issues, from, overIndex) }
              : entry
          );

    const placement = changedPlacement(columns, next, id);

    if (placement !== undefined) {
      commit(next, placement);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnPager
        columns={shown}
        current={Math.min(currentColumn, shown.length - 1)}
        onGo={(index) => {
          const scroller = scrollerRef.current;
          pagingTo.current = index;
          setCurrentColumn(index);
          scroller?.scrollTo({
            left: index * scroller.clientWidth,
            behavior: "smooth",
          });
        }}
      />
      <DndContext
        sensors={sensors}
        // Phones show one column, so never scroll sideways while reordering in it.
        autoScroll={{ threshold: { x: isMobile ? 0 : 0.2, y: 0.2 } }}
        collisionDetection={collisionDetection}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={finish}
      >
        <div
          ref={scrollerRef}
          data-testid="board"
          className={cn(
            "flex min-h-0 flex-1 items-start gap-3 overflow-x-auto overscroll-x-contain p-3 max-md:snap-x max-md:snap-mandatory max-md:items-stretch max-md:gap-0 max-md:p-0",
            moreRight && "md:mask-r-from-95%"
          )}
          onScroll={(event) => {
            setMoreRight(overflowsRight(event.currentTarget));
            const { scrollLeft, clientWidth } = event.currentTarget;
            const index = Math.round(scrollLeft / clientWidth);

            if (pagingTo.current === null || pagingTo.current === index) {
              pagingTo.current = null;
              setCurrentColumn(index);
            }
          }}
          onScrollEnd={(event) => {
            const { scrollLeft, clientWidth } = event.currentTarget;
            pagingTo.current = null;
            setCurrentColumn(Math.round(scrollLeft / clientWidth));
          }}
          onClickCapture={(event) => {
            // A drop that ends over the card it started on must not also open the Issue.
            if (Date.now() - dragEndedAt.current < CLICK_GUARD_MS) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          {shown.map((column) => (
            <BoardColumnView
              key={column.state.id}
              column={column}
              projectId={project.id}
              states={project.states}
              onMove={moveToState}
              pickedId={keyboard.pickedId}
              onCardKeyDown={keyboard.handleCardKeyDown}
              filtered={Object.keys(input.filters).length > 0}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
          {activeIssue === null ? null : (
            <IssueCardBody
              issue={activeIssue}
              className="ring-foreground/10 cursor-grabbing shadow-lg ring-1 md:rotate-2"
            />
          )}
        </DragOverlay>
      </DndContext>
      <div aria-live="assertive" className="sr-only">
        {keyboard.note}
      </div>
    </div>
  );
};
