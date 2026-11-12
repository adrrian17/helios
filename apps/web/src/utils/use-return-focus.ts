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
    const lost =
      document.activeElement === null ||
      document.activeElement === document.body;

    // Only when focus was dropped: a click elsewhere already put it somewhere.
    if (wasOpen.current && !open && lost) {
      opener.current?.focus();
    }

    wasOpen.current = open;
  }, [open]);

  return opener;
};
