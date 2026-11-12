import { useSyncExternalStore } from "react";

/** Whether a CSS media query matches, kept current as the window resizes. */
export const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);

      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    () => window.matchMedia(query).matches
  );
