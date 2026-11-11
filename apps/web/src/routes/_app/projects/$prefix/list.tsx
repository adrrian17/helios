import { Button } from "@helios/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@helios/ui/components/empty";
import { Skeleton } from "@helios/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { FilterXIcon, ListIcon } from "lucide-react";
import { z } from "zod";

import { FilterBar } from "@/components/filter-bar";
import { IssueTable, SortMenu } from "@/components/issue-table";
import { hasFilters, sortFields, toApiFilters } from "@/utils/filters";
import type { Sort, SortField } from "@/utils/filters";
import { orpc } from "@/utils/orpc";
import { rememberView } from "@/utils/project-view";

const DEFAULT_SORT: Sort = { field: "identifier", direction: "asc" };

/** Dates read newest first; every other column starts from the top of its order. */
const firstDirection = (field: SortField): Sort["direction"] =>
  field === "created" || field === "updated" ? "desc" : "asc";

const flipped = { asc: "desc", desc: "asc" } as const;

const ROWS = ["a", "b", "c", "d", "e", "f"];

const ListSkeleton = () => (
  <output
    aria-busy="true"
    aria-label="Loading Issues"
    className="flex flex-col gap-2 p-3"
  >
    {ROWS.map((row) => (
      <Skeleton key={row} className="h-8" />
    ))}
  </output>
);

const ListPage = () => {
  const { prefix } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { filters, sort } = Route.useLoaderDeps();

  const { data: project } = useSuspenseQuery(
    orpc.projects.get.queryOptions({ input: { prefix } })
  );

  const { data: issues } = useSuspenseQuery(
    orpc.issues.list.queryOptions({
      input: { projectId: project.id, filters, sort },
    })
  );

  const filtered = hasFilters(search);

  const setSort = (next: Sort) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        sort: next.field,
        dir: next.direction,
      }),
      replace: true,
    });
  };

  const clearFilters = () => {
    void navigate({
      search: ({ sort: field, dir }) => ({ sort: field, dir }),
      replace: true,
    });
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <FilterBar
        search={search}
        onChange={(next) => {
          void navigate({
            search: { ...next, sort: search.sort, dir: search.dir },
            replace: true,
          });
        }}
      >
        <span className="text-muted-foreground shrink-0 pl-2 text-xs tabular-nums max-md:sr-only">
          {issues.length} {issues.length === 1 ? "Issue" : "Issues"}
        </span>
        <SortMenu sort={sort} onChange={setSort} />
      </FilterBar>
      <div className="min-h-0 flex-1 overflow-y-auto max-md:pb-20">
        {issues.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {filtered ? <FilterXIcon /> : <ListIcon />}
              </EmptyMedia>
              <EmptyTitle>
                {filtered ? "No Issues match these filters" : "No Issues yet"}
              </EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? "Try fewer filters, or clear them to see every Issue."
                  : `Issues added to ${project.name} are listed here.`}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {filtered ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link to="/projects/$prefix/board" params={{ prefix }} />
                  }
                >
                  Add Issues on the Board
                </Button>
              )}
            </EmptyContent>
          </Empty>
        ) : (
          <IssueTable
            label={`${project.name} Issues`}
            issues={issues}
            sort={sort}
            onSort={(field) => {
              setSort({
                field,
                direction:
                  field === sort.field
                    ? flipped[sort.direction]
                    : firstDirection(field),
              });
            }}
          />
        )}
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_app/projects/$prefix/list")({
  validateSearch: z.object({
    sort: z.enum(sortFields).optional().catch(undefined),
    dir: z.enum(["asc", "desc"]).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({
    filters: toApiFilters(search),
    sort:
      search.sort === undefined
        ? DEFAULT_SORT
        : {
            field: search.sort,
            direction: search.dir ?? firstDirection(search.sort),
          },
  }),
  loader: async ({
    context: { orpc: api, queryClient },
    params: { prefix },
    deps: { filters, sort },
  }) => {
    const project = await queryClient.query({
      ...api.projects.get.queryOptions({ input: { prefix } }),
      staleTime: "static",
    });

    await queryClient.query({
      ...api.issues.list.queryOptions({
        input: { projectId: project.id, filters, sort },
      }),
      staleTime: "static",
    });
  },
  onEnter: ({ params }) => {
    rememberView(params.prefix, "list");
  },
  pendingComponent: ListSkeleton,
  component: ListPage,
});
