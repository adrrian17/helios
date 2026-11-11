import { Badge } from "@helios/ui/components/badge";
import { Button, buttonVariants } from "@helios/ui/components/button";
import { cn } from "@helios/ui/lib/utils";
import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createFileRoute,
  notFound,
  useLocation,
} from "@tanstack/react-router";
import { ArchiveIcon, KanbanIcon, ListIcon, SettingsIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ProjectMark } from "@/components/project-mark";
import { NotFound } from "@/components/route-states";
import { filterSearchSchema, filtersOf } from "@/utils/filters";
import { orpc } from "@/utils/orpc";
import { useMe } from "@/utils/use-me";

const VIEW_LINK = cn(
  buttonVariants({ variant: "ghost", size: "sm" }),
  "text-muted-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground max-md:w-11 max-md:px-0"
);

const ProjectLayout = () => {
  const { prefix } = Route.useParams();

  const { data: project } = useSuspenseQuery(
    orpc.projects.get.queryOptions({ input: { prefix } })
  );

  const me = useMe();

  // On phones the Settings header needs the room for the Project name.
  const onSettings = useLocation({
    select: (location) => location.pathname.endsWith("/settings"),
  });

  return (
    <>
      <PageHeader
        actions={
          me.role === "admin" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Project settings"
              render={
                <Link
                  to="/projects/$prefix/settings"
                  params={{ prefix }}
                  activeProps={{
                    "aria-current": "page",
                    className: "bg-muted",
                  }}
                />
              }
              nativeButton={false}
            >
              <SettingsIcon />
            </Button>
          ) : null
        }
      >
        <ProjectMark project={project} className="size-5 max-md:hidden" />
        <h1 className="min-w-0 truncate text-sm font-medium">{project.name}</h1>
        <Badge variant="outline" className="max-sm:hidden">
          <span className="font-mono">{project.prefix}</span>
        </Badge>
        {project.archivedAt === null ? null : (
          <Badge variant="secondary">
            <ArchiveIcon data-icon="inline-start" />
            Archived
          </Badge>
        )}
        <nav
          aria-label="Project views"
          className={cn(
            "ml-1 flex items-center gap-0.5 md:ml-3",
            onSettings && "max-md:hidden"
          )}
        >
          <Link
            to="/projects/$prefix/board"
            params={{ prefix }}
            search={filtersOf}
            className={VIEW_LINK}
          >
            <KanbanIcon />
            <span className="max-md:sr-only">Board</span>
          </Link>
          <Link
            to="/projects/$prefix/list"
            params={{ prefix }}
            search={filtersOf}
            className={VIEW_LINK}
          >
            <ListIcon />
            <span className="max-md:sr-only">List</span>
          </Link>
        </nav>
      </PageHeader>
      <Outlet />
    </>
  );
};

export const Route = createFileRoute("/_app/projects/$prefix")({
  validateSearch: filterSearchSchema,
  loader: async ({
    context: { orpc: api, queryClient },
    params: { prefix },
  }) => {
    try {
      await queryClient.query({
        ...api.projects.get.queryOptions({ input: { prefix } }),
        staleTime: "static",
      });
    } catch (error) {
      if (error instanceof ORPCError && error.code === "NOT_FOUND") {
        // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router signals not-found by throwing.
        throw notFound();
      }

      throw error;
    }
  },
  component: ProjectLayout,
  notFoundComponent: () => <NotFound what="Project" />,
});
