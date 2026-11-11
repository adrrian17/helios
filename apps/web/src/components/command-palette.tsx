import { Button } from "@helios/ui/components/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@helios/ui/components/command";
import { Kbd } from "@helios/ui/components/kbd";
import { Spinner } from "@helios/ui/components/spinner";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  CircleUserRoundIcon,
  KeyboardIcon,
  PlusIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { StateIcon } from "@/components/issue-meta";
import { ProjectMark } from "@/components/project-mark";
import { orpc } from "@/utils/orpc";
import { keysOf, shortcuts } from "@/utils/shortcuts";
import { useMe } from "@/utils/use-me";
import { useMediaQuery } from "@/utils/use-media-query";

const includes = (text: string, search: string) =>
  text.toLowerCase().includes(search.toLowerCase());

/** Every typed word appears somewhere, so "go labels" finds "Go to Labels". */
const matchesWords = (text: string, search: string) =>
  search.split(/\s+/u).every((word) => includes(text, word));

const PaletteBody = ({
  onClose,
  currentPrefix,
  onCreateIssue,
  onShowShortcuts,
}: {
  onClose: () => void;
  currentPrefix: string | undefined;
  onCreateIssue: () => void;
  onShowShortcuts: () => void;
}) => {
  const navigate = useNavigate();
  const me = useMe();
  // Phones have no keyboard to use the shortcut list with.
  const hasKeyboard = useMediaQuery("(min-width: 48rem)");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const query = useDeferredValue(search.trim());
  const projects = useQuery(orpc.projects.list.queryOptions());

  const issues = useQuery({
    ...orpc.issues.search.queryOptions({ input: { query } }),
    enabled: query !== "",
    placeholderData: keepPreviousData,
  });

  const current = projects.data?.find(
    (project) => project.prefix === currentPrefix
  );

  const go = (to: () => Promise<void>) => {
    onClose();
    void to();
  };

  const actions: {
    id: string;
    label: string;
    keywords?: string;
    icon: LucideIcon;
    keys?: string[];
    run: () => void;
  }[] = [
    {
      id: "create",
      label:
        current === undefined ? "New Issue…" : `New Issue in ${current.name}…`,
      keywords: "create add",
      icon: PlusIcon,
      keys: keysOf(shortcuts.createIssue),
      run: onCreateIssue,
    },
    {
      id: "my-issues",
      label: "Go to My Issues",
      icon: CircleUserRoundIcon,
      run: () => {
        go(async () => {
          await navigate({ to: "/my-issues" });
        });
      },
    },
    {
      id: "labels",
      label: "Go to Labels",
      icon: TagIcon,
      run: () => {
        go(async () => {
          await navigate({ to: "/labels" });
        });
      },
    },
    ...(me.role === "admin"
      ? [
          {
            id: "members",
            label: "Go to Members",
            icon: UsersIcon,
            run: () => {
              go(async () => {
                await navigate({ to: "/members" });
              });
            },
          },
        ]
      : []),
    ...(hasKeyboard
      ? [
          {
            id: "shortcuts",
            label: "Keyboard shortcuts",
            keywords: "help keys",
            icon: KeyboardIcon,
            keys: keysOf(shortcuts.help),
            run: onShowShortcuts,
          },
        ]
      : []),
  ];

  const shownActions = actions.filter((action) =>
    matchesWords(`${action.label} ${action.keywords ?? ""}`, query)
  );

  const shownProjects = (projects.data ?? []).filter(
    (project) =>
      includes(project.name, query) || includes(project.prefix, query)
  );

  const foundIssues = query === "" ? [] : (issues.data ?? []);

  // In render order. Issues arrive after the keystroke, so the highlight
  // falls back to the first item whenever the chosen one is gone.
  const values = [
    ...foundIssues.map((issue) => `issue:${issue.id}`),
    ...shownActions.map((action) => `action:${action.id}`),
    ...shownProjects.map((project) => `project:${project.id}`),
  ];

  const highlighted = values.includes(selected) ? selected : (values[0] ?? "");
  const searching = query !== "" && issues.isFetching;

  const issueGroup =
    foundIssues.length > 0 ? (
      <CommandGroup heading="Issues">
        {foundIssues.map((issue) => (
          <CommandItem
            key={issue.id}
            value={`issue:${issue.id}`}
            onSelect={() => {
              go(async () => {
                await navigate({
                  to: "/issue/$identifier",
                  params: { identifier: issue.identifier },
                });
              });
            }}
          >
            <StateIcon category={issue.state.category} />
            <span className="text-muted-foreground w-[4.5rem] shrink-0 font-mono text-xs tabular-nums">
              {issue.identifier}
            </span>
            {/* Phones show two lines of title rather than cutting it at a few words. */}
            <span className="truncate max-md:line-clamp-2 max-md:whitespace-normal">
              {issue.title}
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
    ) : null;

  return (
    <Command
      shouldFilter={false}
      value={highlighted}
      onValueChange={setSelected}
      loop
      label="Command palette"
      className="max-md:h-full"
    >
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <CommandInput
            placeholder="Search Issues, Projects and actions…"
            aria-label="Search Issues, Projects and actions"
            value={search}
            onValueChange={(next) => {
              setSearch(next);
              // Each new search starts from its best match.
              setSelected("");
            }}
          />
        </div>
        {searching ? <Spinner aria-label="Searching" className="mx-1" /> : null}
        <Button variant="ghost" className="md:hidden" onClick={onClose}>
          Cancel
        </Button>
      </div>
      <CommandList className="max-md:max-h-none max-md:flex-1 md:max-h-[min(24rem,60dvh)]">
        {searching && foundIssues.length === 0 ? null : (
          <CommandEmpty>No Issues, Projects or actions match.</CommandEmpty>
        )}
        {issueGroup}
        {shownActions.length > 0 ? (
          <CommandGroup heading="Actions">
            {shownActions.map((action) => (
              <CommandItem
                key={action.id}
                value={`action:${action.id}`}
                onSelect={() => {
                  action.run();
                }}
              >
                <action.icon />
                <span className="truncate">{action.label}</span>
                {action.keys === undefined ? null : (
                  <CommandShortcut className="max-md:hidden">
                    {action.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {shownProjects.length > 0 ? (
          <CommandGroup heading="Projects">
            {shownProjects.map((project) => (
              <CommandItem
                key={project.id}
                value={`project:${project.id}`}
                onSelect={() => {
                  go(async () => {
                    await navigate({
                      to: "/projects/$prefix",
                      params: { prefix: project.prefix },
                    });
                  });
                }}
              >
                <ProjectMark project={project} />
                <span className="truncate">{project.name}</span>
                <CommandShortcut>
                  <span className="font-mono tracking-normal">
                    {project.prefix}
                  </span>
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </Command>
  );
};

/** Cmd+K: open an Issue by Identifier or title, jump to a Project, or run an action. */
export const CommandPalette = ({
  open,
  onClose,
  ...body
}: {
  open: boolean;
  onClose: () => void;
  currentPrefix: string | undefined;
  onCreateIssue: () => void;
  onShowShortcuts: () => void;
}) => (
  <CommandDialog
    open={open}
    onOpenChange={(next) => {
      if (!next) {
        onClose();
      }
    }}
    title="Command palette"
    description="Search Issues by Identifier or title, jump to a Project, or run an action."
    className="max-md:top-0 sm:max-w-xl"
  >
    <PaletteBody onClose={onClose} {...body} />
  </CommandDialog>
);
