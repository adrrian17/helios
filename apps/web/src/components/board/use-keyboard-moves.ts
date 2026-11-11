import { useState } from "react";
import { flushSync } from "react-dom";

import {
  changedPlacement,
  columnOf,
  describePosition,
  locate,
  moveIssue,
} from "@/components/board/board-model";
import type { Placement } from "@/components/board/board-model";
import type { BoardColumn, IssueRow } from "@/utils/domain";

/** Arrow keys while an Issue is picked up: [column step, position step]. */
const KEY_STEPS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
} satisfies Record<string, [number, number]>;

const isStepKey = (key: string): key is keyof typeof KEY_STEPS =>
  Object.hasOwn(KEY_STEPS, key);

const clamp = (value: number, max: number) => Math.max(0, Math.min(value, max));

/**
 * Space picks an Issue up, arrows move it within or across columns, Space or
 * Enter drops it and Escape puts it back. This bypasses dnd-kit's keyboard
 * sensor, which scrolls the board instead of moving the card between columns.
 */
export const useKeyboardMoves = ({
  columns,
  working,
  setWorking,
  commit,
  scroller,
}: {
  columns: BoardColumn[];
  working: BoardColumn[] | null;
  setWorking: (columns: BoardColumn[] | null) => void;
  commit: (next: BoardColumn[], placement: Placement) => void;
  scroller: React.RefObject<HTMLElement | null>;
}) => {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  // A card that changes column remounts, so focus follows it right after the synchronous render.
  const refocus = (id: string) => {
    const link = scroller.current?.querySelector<HTMLElement>(
      `[data-issue-id="${id}"] a`
    );

    link?.focus();
    link?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const putDown = () => {
    setPickedId(null);
    setWorking(null);
  };

  const step = (
    issue: IssueRow,
    current: BoardColumn[],
    key: keyof typeof KEY_STEPS
  ) => {
    const [columnStep, positionStep] = KEY_STEPS[key];
    const from = columnOf(current, issue.id);
    const { column: source, index } = locate(current, issue.id);
    const to = clamp(from + columnStep, current.length - 1);
    const target = current[to];

    if (source === undefined || target === undefined) {
      return;
    }

    const toIndex =
      to === from
        ? clamp(index + positionStep, source.issues.length - 1)
        : Math.min(index, target.issues.length);

    const next = moveIssue(current, issue.id, to, toIndex);

    flushSync(() => {
      setWorking(next);
    });
    refocus(issue.id);
    setNote(`${issue.identifier} is ${describePosition(next, issue.id)}.`);
  };

  const handleCardKeyDown = (issue: IssueRow, event: React.KeyboardEvent) => {
    if (pickedId === null) {
      if (event.key === " ") {
        event.preventDefault();
        setPickedId(issue.id);
        setWorking(columns);
        setNote(
          `Picked up ${issue.identifier}. Arrow keys move it, Space drops it, Escape cancels.`
        );
      }

      return;
    }

    if (pickedId !== issue.id) {
      return;
    }

    const current = working ?? columns;

    if (isStepKey(event.key)) {
      event.preventDefault();
      step(issue, current, event.key);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      flushSync(putDown);
      refocus(issue.id);
      setNote(
        `Dropped ${issue.identifier} ${describePosition(current, issue.id)}.`
      );

      const placement = changedPlacement(columns, current, issue.id);

      if (placement !== undefined) {
        commit(current, placement);
      }
    } else if (event.key === "Escape" || event.key === "Tab") {
      putDown();
      setNote(`Cancelled. ${issue.identifier} went back to where it was.`);
    }
  };

  return { pickedId, note, handleCardKeyDown };
};
