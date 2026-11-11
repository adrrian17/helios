import { Skeleton } from "@helios/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Board } from "@/components/board/board";
import { FilterBar } from "@/components/filter-bar";
import { toApiFilters } from "@/utils/filters";
import { orpc } from "@/utils/orpc";
import { rememberView } from "@/utils/project-view";

const SKELETON_COLUMNS = [
  { id: "a", cards: ["1", "2", "3"] },
  { id: "b", cards: ["1", "2"] },
  { id: "c", cards: ["1"] },
  { id: "d", cards: [] },
];

const BoardSkeleton = () => (
  <output
    aria-busy="true"
    aria-label="Loading board"
    className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3"
  >
    {SKELETON_COLUMNS.map((column) => (
      <div
        key={column.id}
        className="bg-muted/50 dark:bg-muted/30 flex w-72 shrink-0 flex-col gap-1.5 rounded-xl p-1.5 max-md:w-full"
      >
        <Skeleton className="m-1.5 h-4 w-24" />
        {column.cards.map((card) => (
          <Skeleton key={card} className="h-20" />
        ))}
      </div>
    ))}
  </output>
);

const BoardPage = () => {
  const { prefix } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { filters } = Route.useLoaderDeps();

  const { data: project } = useSuspenseQuery(
    orpc.projects.get.queryOptions({ input: { prefix } })
  );

  const input = { projectId: project.id, filters };

  const { data: columns } = useSuspenseQuery(
    orpc.issues.board.queryOptions({ input })
  );

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <FilterBar
        search={search}
        onChange={(next) => {
          void navigate({ search: next, replace: true });
        }}
      />
      <Board project={project} input={input} columns={columns} />
    </main>
  );
};

export const Route = createFileRoute("/_app/projects/$prefix/board")({
  loaderDeps: ({ search }) => ({ filters: toApiFilters(search) }),
  loader: async ({
    context: { orpc: api, queryClient },
    params: { prefix },
    deps: { filters },
  }) => {
    const project = await queryClient.query({
      ...api.projects.get.queryOptions({ input: { prefix } }),
      staleTime: "static",
    });

    await queryClient.query({
      ...api.issues.board.queryOptions({
        input: { projectId: project.id, filters },
      }),
      staleTime: "static",
    });
  },
  onEnter: ({ params }) => {
    rememberView(params.prefix, "board");
  },
  pendingComponent: BoardSkeleton,
  component: BoardPage,
});
