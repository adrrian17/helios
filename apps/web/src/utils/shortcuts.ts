import { useEffect, useEffectEvent } from "react";

interface Shortcut {
  /** `KeyboardEvent.key`, lower case for letters. */
  key: string;
  /** Needs Cmd (shown on a Mac) or Ctrl (shown elsewhere), and then works while typing too. */
  mod?: boolean;
  label: string;
  scope: typeof ANYWHERE | typeof ISSUE_VIEW;
}

const ANYWHERE = "En cualquier lugar";
const ISSUE_VIEW = "Vista de tarea";

/** Every keyboard shortcut; the help dialog lists this table and `useShortcut` binds from it. */
export const shortcuts = {
  palette: {
    key: "k",
    mod: true,
    label: "Abrir la paleta de comandos",
    scope: ANYWHERE,
  },
  search: {
    key: "/",
    label: "Buscar tareas y proyectos",
    scope: ANYWHERE,
  },
  createIssue: {
    key: "c",
    label: "Crear una tarea en este proyecto",
    scope: ANYWHERE,
  },
  help: {
    key: "?",
    label: "Mostrar atajos de teclado",
    scope: ANYWHERE,
  },
  close: {
    key: "Escape",
    label: "Cerrar un diálogo o selector",
    scope: ANYWHERE,
  },
  state: { key: "s", label: "Cambiar estado", scope: ISSUE_VIEW },
  assignee: { key: "a", label: "Cambiar responsable", scope: ISSUE_VIEW },
  previousIssue: {
    key: "k",
    label: "Ir a la tarea anterior de la vista",
    scope: ISSUE_VIEW,
  },
  nextIssue: {
    key: "j",
    label: "Ir a la tarea siguiente de la vista",
    scope: ISSUE_VIEW,
  },
} satisfies Record<string, Shortcut>;

type ShortcutName = keyof typeof shortcuts;

/** Keys on a focused Board card. The Board handles them itself (`use-keyboard-moves.ts`), so `useShortcut` never binds them. */
export const boardKeys = [
  { label: "Levantar la tarea enfocada", keys: ["Espacio"] },
  {
    label: "Moverla dentro de un estado o entre estados",
    keys: ["←", "↑", "↓", "→"],
  },
  { label: "Soltarla", keys: ["Espacio"] },
  { label: "Devolverla a su lugar", keys: ["Esc"] },
];

const isMac = () => /Mac|iPhone|iPad/u.test(navigator.userAgent);

export const submitKeys = () => (isMac() ? "⌘↵" : "Ctrl+Enter");

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
// One that is animating out (`data-closed`) no longer holds the keyboard.
const OVERLAY = ["dialog", "alertdialog", "menu"]
  .map((role) => `[role='${role}']:not([data-closed])`)
  .join(", ");

export const overlayOpen = () => document.querySelector(OVERLAY) !== null;

// A field in an overlay that is animating out still has focus, but takes no more text.
const typing = (event: KeyboardEvent) =>
  event.target instanceof Element &&
  event.target.closest(TYPING) !== null &&
  event.target.closest("[data-closed]") === null;

const modified = (event: KeyboardEvent) =>
  event.metaKey || event.ctrlKey || event.altKey;

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
