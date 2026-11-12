import { Button } from "@helios/ui/components/button";
import { cn } from "@helios/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { StateIcon } from "@/components/issue-meta";
import type { BoardColumn } from "@/utils/domain";

/** Phones show one snap-scrolled column at a time; this names it and steps to its neighbours. */
export const ColumnPager = ({
  columns,
  current,
  onGo,
}: {
  columns: BoardColumn[];
  current: number;
  onGo: (index: number) => void;
}) => {
  const column = columns[current];

  if (column === undefined) {
    return null;
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b px-1 md:hidden">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous Workflow State"
        disabled={current === 0}
        onClick={() => {
          onGo(current - 1);
        }}
      >
        <ChevronLeftIcon />
      </Button>
      <div
        className="flex min-w-0 flex-1 flex-col items-center gap-1"
        aria-live="polite"
        data-testid="column-indicator"
      >
        <span className="flex max-w-full items-center gap-1.5 text-sm font-medium">
          <StateIcon category={column.state.category} />
          <span className="truncate">{column.state.name}</span>
          <span className="text-muted-foreground text-xs font-normal tabular-nums">
            {column.issues.length}
            <span className="sr-only"> Issues</span>
          </span>
        </span>
        <span className="flex gap-1" aria-hidden="true">
          {columns.map((entry, index) => (
            <span
              key={entry.state.id}
              className={cn(
                "size-1.5 rounded-full transition-colors",
                index === current ? "bg-foreground" : "bg-foreground/20"
              )}
            />
          ))}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next Workflow State"
        disabled={current === columns.length - 1}
        onClick={() => {
          onGo(current + 1);
        }}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
};
