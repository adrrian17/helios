import { priorityLabels } from "@helios/api/domain";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@helios/ui/components/empty";
import { Skeleton } from "@helios/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CircleCheckBigIcon } from "lucide-react";

import {
  LabelDot,
  PriorityIcon,
  RelativeTime,
  StateIcon,
} from "@/components/issue-meta";
import { PageHeader, PageTitle } from "@/components/page-header";
import type { IssueRow } from "@/utils/domain";
import { orpc } from "@/utils/orpc";

const MAX_LABELS = 2;

const MyIssueRow = ({ issue }: { issue: IssueRow }) => (
  <li>
    <Link
      to="/issue/$identifier"
      params={{ identifier: issue.identifier }}
      className="hover:bg-muted/50 focus-visible:ring-ring flex h-10 items-center gap-3 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset max-md:h-12"
    >
      <PriorityIcon priority={issue.priority} labelled={false} />
      <span className="sr-only">
        Prioridad: {priorityLabels[issue.priority]}
      </span>
      <span className="text-muted-foreground w-14 shrink-0 text-xs tabular-nums md:w-16">
        {issue.identifier}
      </span>
      <StateIcon category={issue.state.category} />
      <span className="sr-only">{issue.state.name}</span>
      <span className="min-w-0 flex-1 truncate">{issue.title}</span>
      <span className="flex shrink-0 items-center gap-1 max-lg:hidden">
        {issue.labels.slice(0, MAX_LABELS).map((label) => (
          <span
            key={label.id}
            className="text-muted-foreground inline-flex h-5 max-w-28 items-center gap-1 rounded-md border px-1.5 text-xs"
          >
            <LabelDot color={label.color} />
            <span className="truncate">{label.name}</span>
          </span>
        ))}
      </span>
      <span className="text-muted-foreground w-24 shrink-0 text-right text-xs max-md:hidden">
        <RelativeTime date={issue.updatedAt} />
      </span>
    </Link>
  </li>
);

const MyIssuesList = () => {
  const { data: groups } = useSuspenseQuery(orpc.issues.mine.queryOptions());

  if (groups.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleCheckBigIcon />
          </EmptyMedia>
          <EmptyTitle>No tienes tareas pendientes</EmptyTitle>
          <EmptyDescription>
            Las tareas que te asignan aparecen aquí mientras están en un estado
            de categoría Pendiente o En curso, las más urgentes primero.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col">
      {groups.map(({ project, issues }) => (
        <section key={project.id} aria-labelledby={`group-${project.id}`}>
          <h2
            id={`group-${project.id}`}
            className="bg-muted/50 flex h-9 items-center gap-2 border-b px-4 text-sm max-md:h-12"
          >
            <Link
              to="/projects/$prefix"
              params={{ prefix: project.prefix }}
              className="focus-visible:ring-ring flex min-w-0 items-center self-stretch truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-2"
            >
              {project.name}
            </Link>
            <span className="text-muted-foreground text-xs tabular-nums">
              {issues.length}
              <span className="sr-only"> tareas</span>
            </span>
          </h2>
          <ul
            aria-labelledby={`group-${project.id}`}
            className="divide-y border-b"
          >
            {issues.map((issue) => (
              <MyIssueRow key={issue.id} issue={issue} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

const MyIssuesPage = () => (
  <>
    <PageHeader>
      <PageTitle>Mis tareas</PageTitle>
    </PageHeader>
    <main id="main" className="flex-1 overflow-y-auto max-md:pb-20">
      <MyIssuesList />
    </main>
  </>
);

const ROWS = ["a", "b", "c", "d"];

const MyIssuesSkeleton = () => (
  <>
    <PageHeader>
      <PageTitle>Mis tareas</PageTitle>
    </PageHeader>
    <output
      aria-busy="true"
      aria-label="Cargando mis tareas"
      className="flex flex-col gap-2 p-4"
    >
      <Skeleton className="h-5 w-40" />
      {ROWS.map((row) => (
        <Skeleton key={row} className="h-8" />
      ))}
    </output>
  </>
);

export const Route = createFileRoute("/_app/my-issues")({
  staticData: { issueList: true },
  loader: async ({ context: { orpc: api, queryClient } }) => {
    await queryClient.query({
      ...api.issues.mine.queryOptions(),
      staleTime: "static",
    });
  },
  head: () => ({ meta: [{ title: "Mis tareas" }] }),
  pendingComponent: MyIssuesSkeleton,
  component: MyIssuesPage,
});
