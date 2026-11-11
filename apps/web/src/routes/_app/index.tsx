import { Button } from "@helios/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@helios/ui/components/empty";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { FolderKanbanIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { CreateProjectDialog } from "@/components/create-project-dialog";
import { PageHeader, PageTitle } from "@/components/page-header";
import { useMe } from "@/utils/use-me";

const NoProjects = () => {
  const me = useMe();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader>
        <PageTitle>Helios</PageTitle>
      </PageHeader>
      <main className="grid flex-1 place-items-center overflow-y-auto p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanbanIcon />
            </EmptyMedia>
            <EmptyTitle>No Projects yet</EmptyTitle>
            <EmptyDescription>
              {me.role === "admin"
                ? "Create a Project to get a board for your team’s Issues."
                : "Projects appear in the sidebar once an Admin creates one."}
            </EmptyDescription>
          </EmptyHeader>
          {me.role === "admin" ? (
            <EmptyContent>
              <Button
                onClick={() => {
                  setCreating(true);
                }}
              >
                <PlusIcon data-icon="inline-start" />
                New Project
              </Button>
              <CreateProjectDialog open={creating} onOpenChange={setCreating} />
            </EmptyContent>
          ) : null}
        </Empty>
      </main>
    </>
  );
};

export const Route = createFileRoute("/_app/")({
  beforeLoad: async ({ context: { orpc, queryClient } }) => {
    const [first] = await queryClient.query(orpc.projects.list.queryOptions());

    if (first !== undefined) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing.
      throw redirect({
        to: "/projects/$prefix",
        params: { prefix: first.prefix },
      });
    }
  },
  component: NoProjects,
});
