import { Button } from "@helios/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@helios/ui/components/empty";
import { Skeleton } from "@helios/ui/components/skeleton";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageTitle } from "@/components/page-header";
import {
  SettingsList,
  SettingsPage,
  SettingsSection,
} from "@/components/settings-section";
import { formatDate } from "@/utils/format";
import { orpc } from "@/utils/orpc";
import { useMe } from "@/utils/use-me";

const ArchivedList = () => {
  const me = useMe();

  const { data: projects } = useSuspenseQuery(
    orpc.projects.listArchived.queryOptions()
  );

  const unarchive = useMutation({
    ...orpc.projects.unarchive.mutationOptions(),
    onSuccess: () => {
      toast.success("Proyecto desarchivado.");
    },
  });

  const description = `Ocultos de la barra lateral y de Mis tareas, con todas sus tareas intactas.${
    me.role === "admin" ? " Desarchiva uno para recuperarlo." : ""
  }`;

  return (
    <SettingsSection
      title={`${projects.length} ${projects.length === 1 ? "proyecto" : "proyectos"}`}
      description={description}
    >
      {projects.length === 0 ? (
        <div className="rounded-lg border">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ArchiveIcon />
              </EmptyMedia>
              <EmptyTitle>No hay proyectos archivados</EmptyTitle>
              <EmptyDescription>
                Los proyectos archivados salen de la barra lateral y llegan
                aquí, con sus tableros intactos.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <SettingsList label="Proyectos archivados">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex items-center gap-3 px-4 py-2 max-md:py-1"
            >
              <Link
                to="/projects/$prefix/board"
                params={{ prefix: project.prefix }}
                className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col justify-center rounded-sm outline-none hover:underline focus-visible:ring-3 max-md:min-h-11"
              >
                <span className="truncate text-sm font-medium">
                  {project.name}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  <span className="tabular-nums">{project.prefix}</span>
                  {project.archivedAt === null
                    ? null
                    : ` · Archivado el ${formatDate(project.archivedAt)}`}
                </span>
              </Link>
              {me.role === "admin" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unarchive.isPending}
                  onClick={() => {
                    unarchive.mutate({ id: project.id });
                  }}
                >
                  <ArchiveRestoreIcon data-icon="inline-start" />
                  Desarchivar
                </Button>
              ) : null}
            </li>
          ))}
        </SettingsList>
      )}
    </SettingsSection>
  );
};

const ArchivedPage = () => (
  <>
    <PageHeader>
      <PageTitle>Proyectos archivados</PageTitle>
    </PageHeader>
    <SettingsPage>
      <ArchivedList />
    </SettingsPage>
  </>
);

const ArchivedSkeleton = () => (
  <>
    <PageHeader>
      <PageTitle>Proyectos archivados</PageTitle>
    </PageHeader>
    <SettingsPage>
      <Skeleton className="h-32" />
    </SettingsPage>
  </>
);

export const Route = createFileRoute("/_app/projects/archived")({
  loader: async ({ context: { orpc: api, queryClient } }) => {
    await queryClient.query({
      ...api.projects.listArchived.queryOptions(),
      staleTime: "static",
    });
  },
  head: () => ({ meta: [{ title: "Proyectos archivados" }] }),
  pendingComponent: ArchivedSkeleton,
  component: ArchivedPage,
});
