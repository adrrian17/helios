import { useEffect, useRef } from "react";

/**
 * Ref for the control that opens an inline editor. When the editor closes
 * and its input took focus away with it, focus goes back to that control,
 * whether it stayed on screen or came back in place of the editor.
 */
export const useReturnFocus = <T extends HTMLElement>(open: boolean) => {
  const opener = useRef<T>(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    const closed = wasOpen.current && !open;
    wasOpen.current = open;

    // Deferred: an editor that closes on blur gets here before focus lands on what was clicked or tabbed to.
    const timer = setTimeout(() => {
      // Only when focus was dropped: a click or Tab elsewhere already put it somewhere.
      const lost =
        document.activeElement === null ||
        document.activeElement === document.body;

      if (closed && lost) {
        opener.current?.focus();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [open]);

  return opener;
};

/**
 * For a menu whose item opens an inline editor in place of the menu's
 * trigger: the menu must not move focus on close, or it lands on some older
 * trigger and takes it from the editor.
 */
export const useEditorMenuFocus = () => {
  const opening = useRef(false);

  return {
    openingEditor: () => {
      opening.current = true;
    },
    finalFocus: () => {
      const restore = !opening.current;
      opening.current = false;

      return restore;
    },
  };
};
