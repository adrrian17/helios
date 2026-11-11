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
  ChevronRightIcon,
  LinkIcon,
  MoreHorizontalIcon,
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
import { useIssue } from "@/components/issue/use-issue";
import { PageHeader } from "@/components/page-header";
import { ProjectMark } from "@/components/project-mark";
import { NotFound } from "@/components/route-states";
import { orpc } from "@/utils/orpc";
import { useMediaQuery } from "@/utils/use-media-query";

const IssueActions = ({ onMoveTo }: { onMoveTo: () => void }) => {
  const issue = useIssue();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { identifier } = Route.useParams();
  const issueKey = orpc.issues.get.queryKey({ input: { identifier } });
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
    toast.success(`${issue.identifier} deleted.`);
    await queryClient.invalidateQueries();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Issue actions" />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onMoveTo}>
              <ArrowRightLeftIcon />
              Move to…
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void navigator.clipboard
                  .writeText(window.location.href)
                  .then(() => toast.success("Link copied."))
                  .catch(() => toast.error("Couldn’t copy the link."));
              }}
            >
              <LinkIcon />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                setConfirm({
                  title: `Delete ${issue.identifier}?`,
                  description:
                    "Its Checklist, Comments and Activity go with it, and its number is never reused. To keep a record, move it to a cancelled Workflow State instead.",
                  confirmLabel: "Delete Issue",
                  destructive: true,
                  onConfirm: deleteIssue,
                });
              }}
            >
              <TrashIcon />
              Delete Issue…
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        request={confirm}
        pending={remove.isPending}
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
  // Which picker is open; kept here so a shortcut layer can open one by name.
  const [openPicker, setOpenPicker] = useState<IssuePicker | null>(null);

  const { data: project } = useSuspenseQuery(
    orpc.projects.get.queryOptions({
      input: { prefix: issue.project.prefix },
    })
  );

  const properties = (
    <IssueProperties
      states={project.states}
      openPicker={openPicker}
      onOpenPickerChange={setOpenPicker}
    />
  );

  return (
    <>
      <PageHeader
        actions={
          <IssueActions
            onMoveTo={() => {
              setOpenPicker("state");
            }}
          />
        }
      >
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5"
        >
          <Link
            to="/projects/$prefix"
            params={{ prefix: project.prefix }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex min-w-0 items-center gap-2 rounded-sm text-sm outline-none focus-visible:ring-3"
          >
            <ProjectMark project={project} className="size-5" />
            <span className="truncate max-sm:sr-only">{project.name}</span>
          </Link>
          <ChevronRightIcon
            aria-hidden="true"
            className="text-muted-foreground size-3.5 shrink-0"
          />
          <span
            aria-current="page"
            className="font-mono text-sm font-medium tabular-nums"
          >
            {issue.identifier}
          </span>
        </nav>
      </PageHeader>
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-10 md:py-10">
            <IssueTitle />
            {wide ? null : (
              <div className="bg-card rounded-lg border p-2">{properties}</div>
            )}
            <IssueDescription />
            <IssueChecklist />
            <IssueTimeline />
          </div>
        </main>
        {wide ? (
          <aside
            aria-label="Properties"
            className="bg-sidebar/40 w-80 shrink-0 overflow-y-auto border-l px-4 py-6"
          >
            {properties}
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
      aria-label="Loading Issue"
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
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title ?? "Issue" }],
  }),
  pendingComponent: IssueSkeleton,
  notFoundComponent: () => <NotFound what="Issue" />,
  component: IssuePage,
});
