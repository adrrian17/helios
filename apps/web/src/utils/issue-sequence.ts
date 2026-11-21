import { useEffect } from "react";

// The Identifiers of the last List, Board or My Issues shown, in screen order.
// In memory only: after a reload, or from a direct link, the Issue view has no neighbours.
let sequence: string[] = [];

/** Records the order a view shows its Issues in, so the Issue view can step through them. */
export const useIssueSequence = (identifiers: string[]) => {
  const key = identifiers.join(" ");

  useEffect(() => {
    sequence = key === "" ? [] : key.split(" ");
  }, [key]);
};

/** Where an Issue sits in the last view shown, or null when that view does not hold it. */
export const neighboursOf = (identifier: string) => {
  const index = sequence.indexOf(identifier);

  if (index === -1) {
    return null;
  }

  return {
    position: index + 1,
    total: sequence.length,
    previous: sequence[index - 1],
    next: sequence[index + 1],
  };
};
