import type { BoardColumn } from "@/utils/domain";

/** Where an Issue lands: its column and the Issue right above it (null for the top). This is what `issues.move` takes. */
export interface Placement {
  id: string;
  stateId: string;
  afterId: string | null;
}

/** The index of the column that is `id` or holds the Issue `id`. */
export const columnOf = (columns: BoardColumn[], id: string) =>
  columns.findIndex(
    (column) =>
      column.state.id === id || column.issues.some((issue) => issue.id === id)
  );

export const locate = (columns: BoardColumn[], id: string) => {
  const column = columns[columnOf(columns, id)];
  const index = column?.issues.findIndex((issue) => issue.id === id) ?? -1;

  return { column, index, issue: column?.issues[index] };
};

const placementOf = (
  columns: BoardColumn[],
  id: string
): Placement | undefined => {
  const { column, index } = locate(columns, id);

  return column === undefined || index === -1
    ? undefined
    : {
        id,
        stateId: column.state.id,
        afterId: column.issues[index - 1]?.id ?? null,
      };
};

/** The placement to send, or undefined when the Issue ended where it started. */
export const changedPlacement = (
  before: BoardColumn[],
  after: BoardColumn[],
  id: string
) => {
  const from = placementOf(before, id);
  const to = placementOf(after, id);

  return to === undefined ||
    (from?.stateId === to.stateId && from.afterId === to.afterId)
    ? undefined
    : to;
};

export const moveIssue = (
  columns: BoardColumn[],
  id: string,
  toColumn: number,
  toIndex: number
) => {
  const { issue } = locate(columns, id);

  if (issue === undefined) {
    return columns;
  }

  return columns.map((column, index) => {
    const rest = column.issues.filter((row) => row.id !== id);

    return index === toColumn
      ? {
          ...column,
          issues: rest.toSpliced(toIndex, 0, { ...issue, state: column.state }),
        }
      : { ...column, issues: rest };
  });
};

export const describePosition = (columns: BoardColumn[], id: string) => {
  const { column, index } = locate(columns, id);

  return column === undefined
    ? "outside the board"
    : `in ${column.state.name}, position ${index + 1} of ${column.issues.length}`;
};
