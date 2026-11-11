import { Button } from "@helios/ui/components/button";
import { useLocation, useParams } from "@tanstack/react-router";
import { PlusIcon, SearchIcon } from "lucide-react";
import { createContext, use, useMemo, useState } from "react";

import { CommandPalette } from "@/components/command-palette";
import { CreateIssueDialog } from "@/components/create-issue-dialog";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { overlayOpen, useShortcut } from "@/utils/shortcuts";

/** At most one of these is open at a time. */
type Overlay =
  | { kind: "palette" }
  | { kind: "create"; prefix: string | undefined }
  | { kind: "shortcuts" };

interface Commands {
  openPalette: () => void;
  /** Opens the create dialog on the current Project, if a page has one. */
  createIssue: () => void;
  showShortcuts: () => void;
}

const CommandsContext = createContext<Commands | null>(null);

export const useCommands = () => {
  const commands = use(CommandsContext);

  if (commands === null) {
    throw new Error("useCommands needs a CommandsProvider");
  }

  return commands;
};

/** The Project the page is about: its prefix from a Project route or an Issue's Identifier. */
const useCurrentPrefix = () => {
  const params = useParams({ strict: false });

  return params.prefix ?? params.identifier?.split("-")[0]?.toUpperCase();
};

/** The palette, the create dialog, the shortcut help and the keys that open them, for every signed-in page. */
export const CommandsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const prefix = useCurrentPrefix();

  const commands = useMemo<Commands>(
    () => ({
      openPalette: () => {
        setOverlay({ kind: "palette" });
      },
      createIssue: () => {
        setOverlay({ kind: "create", prefix });
      },
      showShortcuts: () => {
        setOverlay({ kind: "shortcuts" });
      },
    }),
    [prefix]
  );

  const close = () => {
    setOverlay(null);
  };

  useShortcut("palette", () => {
    if (overlay?.kind === "palette") {
      close();
    } else if (!overlayOpen()) {
      commands.openPalette();
    }
  });
  useShortcut("search", commands.openPalette);
  useShortcut("createIssue", commands.createIssue);
  useShortcut("help", commands.showShortcuts);

  return (
    <CommandsContext value={commands}>
      {children}
      <CommandPalette
        open={overlay?.kind === "palette"}
        onClose={close}
        currentPrefix={prefix}
        onCreateIssue={() => {
          commands.createIssue();
        }}
        onShowShortcuts={() => {
          commands.showShortcuts();
        }}
      />
      <CreateIssueDialog
        open={overlay?.kind === "create"}
        prefix={overlay?.kind === "create" ? overlay.prefix : undefined}
        onClose={close}
      />
      <ShortcutsDialog open={overlay?.kind === "shortcuts"} onClose={close} />
    </CommandsContext>
  );
};

/** Pages whose phone layout leaves room for the floating New Issue button. */
const FAB_PAGE = /^\/(?:my-issues|projects\/[^/]+\/(?:board|list))$/u;

const useFabPage = () =>
  useLocation({ select: (location) => FAB_PAGE.test(location.pathname) });

/**
 * Search, and New Issue where there is no floating button, for the page
 * header on phones, where there is no keyboard to press Cmd+K or C.
 */
export const PhoneCommands = () => {
  // Error and not-found pages can render outside the signed-in layout.
  const commands = use(CommandsContext);
  const fabPage = useFabPage();

  if (commands === null) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Search"
        className="md:hidden"
        onClick={() => {
          commands.openPalette();
        }}
      >
        <SearchIcon />
      </Button>
      {fabPage ? null : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New Issue"
          className="md:hidden"
          onClick={() => {
            commands.createIssue();
          }}
        >
          <PlusIcon />
        </Button>
      )}
    </>
  );
};

/** The phone's way to press C on Issue lists: a floating button in thumb reach. */
export const CreateIssueFab = () => {
  const { createIssue } = useCommands();
  const fabPage = useFabPage();

  if (!fabPage) {
    return null;
  }

  return (
    <Button
      size="fab"
      aria-label="New Issue"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 md:hidden"
      onClick={() => {
        createIssue();
      }}
    >
      <PlusIcon />
    </Button>
  );
};
