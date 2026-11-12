export type ProjectView = "board" | "list";

const keyOf = (prefix: string) => `helios:project-view:${prefix}`;

/** Remembers the view last opened in a Project, per browser. */
export const rememberView = (prefix: string, view: ProjectView) => {
  try {
    localStorage.setItem(keyOf(prefix), view);
  } catch {
    // Storage is blocked (private mode, policy): the Board stays the default.
  }
};

export const rememberedView = (prefix: string): ProjectView => {
  try {
    return localStorage.getItem(keyOf(prefix)) === "list" ? "list" : "board";
  } catch {
    return "board";
  }
};
