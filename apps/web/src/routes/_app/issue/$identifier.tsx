import { Button } from "@helios/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@helios/ui/components/dropdown-menu";
import { Skeleton } from "@helios/ui/components/skeleton";
import { ORPCError } from "@orpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  Link,
  createFileRoute,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowRightLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ConfirmRequest } from "@/components/confirm-dialog";
import { IssueDescription, IssueTitle } from "@/components/issue/issue-body";
import { IssueChecklist } from "@/components/issue/issue-checklist";
import { IssueProperties } from "@/components/issue/issue-properties";
import type { IssuePicker } from "@/components/issue/issue-properties";
import { IssueTimeline } from "@/components/issue/issue-timeline";
import { useIssue, useIssueOptions } from "@/components/issue/use-issue";
import { PageHeader } from "@/components/page-header";
import { NotFound } from "@/components/route-states";
import { neighboursOf } from "@/utils/issue-sequence";
import { orpc } from "@/utils/orpc";
import { useShortcut } from "@/utils/shortcuts";
import { useMediaQuery } from "@/utils/use-media-query";

const RAIL_ID = "issue-properties";
const RAIL_KEY = "helios:issue-rail";

const rememberedRailOpen = () => {
  try {
    return localStorage.getItem(RAIL_KEY) !== "closed";
  } catch {
    return true;
  }
};

const rememberRailOpen = (open: boolean) => {
  try {
    localStorage.setItem(RAIL_KEY, open ? "open" : "closed");
  } catch {
    // Storage is blocked (private mode, policy): the rail stays open by default.
  }
};

const IssueActions = ({ onMoveTo }: { onMoveTo: () => void }) => {
  const issue = useIssue();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { queryKey: issueKey } = useIssueOptions();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const remove = useMutation({
    ...orpc.issues.delete.mutationOptions(),
    meta: { skipRefetch: true },
  });

  // Leave first, then refresh, so the deleted Issue is never refetched into an error.
  const deleteIssue = async () => {
    await remove.mutateAsync({ id: issue.id });
    await navigate({
      to: "/projects/$prefix",
      params: { prefix: issue.project.prefix },
    });
    queryClient.removeQueries({ queryKey: issueKey });
    toast.success(`${issue.identifier} eliminada.`);
    await queryClient.invalidateQueries();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Acciones de la tarea"
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onMoveTo}>
              <ArrowRightLeftIcon />
              Mover a…
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void navigator.clipboard
                  .writeText(window.location.href)
                  .then(() => toast.success("Enlace copiado."))
                  .catch(() => toast.error("No se pudo copiar el enlace."));
              }}
            >
              <LinkIcon />
              Copiar enlace
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                setConfirm({
                  title: `¿Eliminar ${issue.identifier}?`,
                  description:
                    "Su checklist, sus comentarios y su actividad se eliminan con ella, y su número no se vuelve a usar. Para conservar un registro, muévela a un estado de categoría Cancelada.",
                  confirmLabel: "Eliminar tarea",
                  destructive: true,
                  onConfirm: deleteIssue,
                });
              }}
            >
              <TrashIcon />
              Eliminar tarea…
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        request={confirm}
        onClose={() => {
          setConfirm(null);
        }}
      />
    </>
  );
};

const IssuePage = () => {
  const issue = useIssue();
  const wide = useMediaQuery("(min-width: 64rem)");
  const [railOpen, setRailOpen] = useState(rememberedRailOpen);
  const showRail = wide && railOpen;
  // Which picker is open; kept here so S, P and A can open one by name.
  const [openPicker, setOpenPicker] = useState<IssuePicker | null>(null);

  useShortcut("state", () => {
    setOpenPicker("state");
  });
  useShortcut("priority", () => {
    setOpenPicker("priority");
  });
  useShortcut("assignee", () => {
    setOpenPicker("assignee");
  });

  const navigate = useNavigate();
  const neighbours = neighboursOf(issue.identifier);

  const goTo = (identifier: string | undefined) => {
    if (identifier !== undefined) {
      void navigate({ to: "/issue/$identifier", params: { identifier } });
    }
  };

  useShortcut("previousIssue", () => {
    goTo(neighbours?.previous);
  });
  useShortcut("nextIssue", () => {
    goTo(neighbours?.next);
  });

  const { data: project } = useSuspenseQuery(
    orpc.projects.get.queryOptions({
      input: { prefix: issue.project.prefix },
    })
  );

  const properties = (layout: "rail" | "summary" | "details") => (
    <IssueProperties
      states={project.states}
      openPicker={openPicker}
      onOpenPickerChange={setOpenPicker}
      layout={layout}
    />
  );

  return (
    <>
      <PageHeader
        actions={
          <>
            {neighbours === null ? null : (
              <>
                <span className="text-muted-foreground px-1 text-xs tabular-nums max-sm:hidden">
                  {neighbours.position} / {neighbours.total}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Tarea anterior"
                  disabled={neighbours.previous === undefined}
                  onClick={() => {
                    goTo(neighbours.previous);
                  }}
                >
                  <ChevronUpIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Tarea siguiente"
                  disabled={neighbours.next === undefined}
                  onClick={() => {
                    goTo(neighbours.next);
                  }}
                >
                  <ChevronDownIcon />
                </Button>
              </>
            )}
            {wide ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  railOpen ? "Ocultar propiedades" : "Mostrar propiedades"
                }
                aria-expanded={railOpen}
                aria-controls={RAIL_ID}
                onClick={() => {
                  setRailOpen(!railOpen);
                  rememberRailOpen(!railOpen);
                }}
              >
                {railOpen ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
              </Button>
            ) : null}
            <IssueActions
              onMoveTo={() => {
                setOpenPicker("state");
              }}
            />
          </>
        }
      >
        <nav
          aria-label="Ruta de navegación"
          className="flex min-w-0 items-center gap-1.5"
        >
          <Link
            to="/projects/$prefix"
            params={{ prefix: project.prefix }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-w-0 items-center gap-2 rounded-sm text-sm outline-none focus-visible:ring-3 max-sm:min-h-11"
          >
            <span className="truncate">{project.name}</span>
          </Link>
          <ChevronRightIcon
            aria-hidden="true"
            className="text-muted-foreground size-3.5 shrink-0"
          />
          <span
            aria-current="page"
            className="shrink-0 text-sm font-medium whitespace-nowrap tabular-nums"
          >
            {issue.identifier}
          </span>
        </nav>
      </PageHeader>
      <div className="flex min-h-0 flex-1">
        <main id="main" className="min-w-0 flex-1 overflow-y-auto">
          {/* Keyed so drafts belong to one Issue and never follow a navigation. */}
          <div
            key={issue.id}
            className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-10 md:py-10"
          >
            <IssueTitle />
            {showRail ? null : (
              // Every property sits under the title, so none waits past the checklist.
              <section aria-label="Propiedades" className="flex flex-col gap-2">
                {properties("summary")}
                {properties("details")}
              </section>
            )}
            <IssueDescription />
            <IssueChecklist />
            <IssueTimeline />
          </div>
        </main>
        {showRail ? (
          <aside
            id={RAIL_ID}
            aria-label="Propiedades"
            className="bg-sidebar/40 w-80 shrink-0 overflow-y-auto border-l px-4 py-6"
          >
            {properties("rail")}
          </aside>
        ) : null}
      </div>
    </>
  );
};

const IssueSkeleton = () => (
  <>
    <PageHeader>
      <Skeleton className="h-4 w-40" />
    </PageHeader>
    <output
      aria-busy="true"
      aria-label="Cargando tarea"
      className="flex min-h-0 flex-1"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 md:px-10 md:py-10">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="w-80 shrink-0 border-l max-lg:hidden" />
    </output>
  </>
);

export const Route = createFileRoute("/_app/issue/$identifier")({
  loader: async ({
    context: { orpc: api, queryClient },
    params: { identifier },
  }) => {
    try {
      const issue = await queryClient.query({
        ...api.issues.get.queryOptions({ input: { identifier } }),
        staleTime: "static",
      });

      // Pickers need these when opened; fetch them now so they open full.
      // A failure here only means the picker loads them itself.
      void queryClient
        .query(api.workspace.members.queryOptions())
        .catch(() => null);
      void queryClient.query(api.labels.list.queryOptions()).catch(() => null);

      await queryClient.query({
        ...api.projects.get.queryOptions({
          input: { prefix: issue.project.prefix },
        }),
        staleTime: "static",
      });

      return { title: `${issue.identifier} ${issue.title}` };
    } catch (error) {
      if (error instanceof ORPCError && error.code === "NOT_FOUND") {
        // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router signals not-found by throwing.
        throw notFound();
      }

      throw error;
    }
  },
  head: ({ match, loaderData }) => ({
    meta: [
      {
        title:
          match.status === "notFound"
            ? "No encontrado"
            : (loaderData?.title ?? "Tarea"),
      },
    ],
  }),
  pendingComponent: IssueSkeleton,
  notFoundComponent: () => <NotFound title="Tarea no encontrada" />,
  component: IssuePage,
});
