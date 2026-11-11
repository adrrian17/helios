import { useEffect, useEffectEvent } from "react";

interface Shortcut {
  /** `KeyboardEvent.key`, lower case for letters. */
  key: string;
  /** Needs Cmd (shown on a Mac) or Ctrl (shown elsewhere), and then works while typing too. */
  mod?: boolean;
  label: string;
  scope: "Anywhere" | "Issue view";
}

const ISSUE_VIEW = "Issue view";

/** Every keyboard shortcut; the help dialog lists this table and `useShortcut` binds from it. */
export const shortcuts = {
  palette: {
    key: "k",
    mod: true,
    label: "Open the command palette",
    scope: "Anywhere",
  },
  search: { key: "/", label: "Search Issues and Projects", scope: "Anywhere" },
  createIssue: {
    key: "c",
    label: "Create an Issue in this Project",
    scope: "Anywhere",
  },
  help: { key: "?", label: "Show keyboard shortcuts", scope: "Anywhere" },
  close: {
    key: "Escape",
    label: "Close a dialog or picker",
    scope: "Anywhere",
  },
  state: { key: "s", label: "Change Workflow State", scope: ISSUE_VIEW },
  priority: { key: "p", label: "Change Priority", scope: ISSUE_VIEW },
  assignee: { key: "a", label: "Change assignee", scope: ISSUE_VIEW },
} satisfies Record<string, Shortcut>;

export type ShortcutName = keyof typeof shortcuts;

const isMac = () => /Mac|iPhone|iPad/u.test(navigator.userAgent);

/** What to press, as shown on screen: "⌘ K", "Ctrl K", "Esc", "C". */
export const keysOf = (shortcut: Shortcut): string[] => {
  const key = shortcut.key === "Escape" ? "Esc" : shortcut.key.toUpperCase();

  if (shortcut.mod === true) {
    return [isMac() ? "⌘" : "Ctrl", key];
  }

  return [key];
};

const TYPING =
  "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

// Base UI popovers (the pickers) are dialogs too; menus trap the keyboard the same way.
const OVERLAY = "[role='dialog'], [role='alertdialog'], [role='menu']";

export const overlayOpen = () => document.querySelector(OVERLAY) !== null;

const typing = (event: KeyboardEvent) =>
  event.target instanceof Element && event.target.closest(TYPING) !== null;

const modified = (event: KeyboardEvent) =>
  event.metaKey || event.ctrlKey || event.altKey;

/** Whether a single-key shortcut may run: not while typing, and not over an open dialog. */
const singleKeyAllowed = (event: KeyboardEvent) =>
  !modified(event) && !event.repeat && !typing(event) && !overlayOpen();

/** Cmd or Ctrl, so either works on any keyboard; it works while typing, as in other apps. */
const modPressed = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && !event.altKey;

const matches = (name: ShortcutName, event: KeyboardEvent) => {
  const shortcut: Shortcut = shortcuts[name];

  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  return shortcut.mod === true ? modPressed(event) : singleKeyAllowed(event);
};

/** Runs `run` when the named shortcut is pressed anywhere on the page. */
export const useShortcut = (name: ShortcutName, run: () => void) => {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!event.defaultPrevented && matches(name, event)) {
      // Keeps the key out of whatever field the shortcut focuses.
      event.preventDefault();
      run();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
};
