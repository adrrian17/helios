import { limits, formatIdentifier } from "@helios/api/domain";
import { Badge } from "@helios/ui/components/badge";
import { Button } from "@helios/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@helios/ui/components/field";
import { Input } from "@helios/ui/components/input";
import { Spinner } from "@helios/ui/components/spinner";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ConfirmRequest } from "@/components/confirm-dialog";
import { SettingsPage, SettingsSection } from "@/components/settings-section";
import { WorkflowStatesEditor } from "@/components/workflow-states-editor";
import type { Project } from "@/utils/domain";
import { orpc } from "@/utils/orpc";

const GeneralForm = ({ project }: { project: Project }) => {
  // Null until edited, so a rename elsewhere shows through.
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? project.name;
  const router = useRouter();

  const rename = useMutation({
    ...orpc.projects.rename.mutationOptions(),
    onSuccess: (_data, { name: sent }) => {
      setDraft((current) => (current?.trim() === sent ? null : current));
      // Loaders hold the Project name for the document title.
      void router.invalidate();
      toast.success("Project renamed.");
    },
  });

  const unchanged = name.trim() === project.name || name.trim() === "";

  return (
    <form
      className="bg-card flex flex-col gap-4 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        rename.mutate({ id: project.id, name: name.trim() });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="project-name">Name</FieldLabel>
          <div className="flex gap-2 max-sm:flex-col">
            <Input
              id="project-name"
              autoComplete="off"
              maxLength={limits.name}
              value={name}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
            />
            <Button
              type="submit"
              variant="outline"
              className="shrink-0"
              disabled={unchanged || rename.isPending}
            >
              {rename.isPending ? <Spinner data-icon="inline-start" /> : null}
              Save
            </Button>
          </div>
        </Field>
        <Field>
          {/* Read-only, so a static badge rather than a field that looks editable. */}
          <FieldTitle>Identifier prefix</FieldTitle>
          {/* Field stretches its children; the wrapper takes that, so the badge keeps its width. */}
          <div>
            <Badge variant="outline">
              <span className="font-mono">{project.prefix}</span>
            </Badge>
          </div>
          <FieldDescription>
            Fixed after creation, so Identifiers like{" "}
            <span className="font-mono">
              {formatIdentifier(project.prefix, 1)}
            </span>{" "}
            people have shared never change.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
};

const ArchiveSection = ({ project }: { project: Project }) => {
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const archive = useMutation({
    ...orpc.projects.archive.mutationOptions(),
    onSuccess: () => {
      toast.success(`${project.name} archived. Find it under Archived.`);
    },
  });

  const unarchive = useMutation({
    ...orpc.projects.unarchive.mutationOptions(),
    onSuccess: () => {
      toast.success(`${project.name} is back in the sidebar.`);
    },
  });

  const archived = project.archivedAt !== null;

  return (
    <SettingsSection
      title={archived ? "Unarchive" : "Archive"}
      description={
        archived
          ? "This Project is archived. Unarchive it to bring it back to the sidebar and My Issues."
          : "Archiving hides the Project from the sidebar and My Issues. Nothing is deleted, and you can unarchive it any time."
      }
    >
      <div>
        {archived ? (
          <Button
            variant="outline"
            disabled={unarchive.isPending}
            onClick={() => {
              unarchive.mutate({ id: project.id });
            }}
          >
            <ArchiveRestoreIcon data-icon="inline-start" />
            Unarchive Project
          </Button>
        ) : (
          <Button
            variant="destructive"
            onClick={() => {
              setConfirm({
                title: `Archive ${project.name}?`,
                description:
                  "It leaves the sidebar and My Issues. Its board stays reachable from Archived.",
                confirmLabel: "Archive Project",
                destructive: true,
                onConfirm: async () => {
                  await archive.mutateAsync({ id: project.id });
                },
              });
            }}
          >
            <ArchiveIcon data-icon="inline-start" />
            Archive Project
          </Button>
        )}
      </div>
      <ConfirmDialog
        request={confirm}
        onClose={() => {
          setConfirm(null);
        }}
      />
    </SettingsSection>
  );
};

const SettingsRoute = () => {
  const { prefix } = Route.useParams();

  const { data: project } = useSuspenseQuery(
    orpc.projects.get.queryOptions({ input: { prefix } })
  );

  return (
    <SettingsPage>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm">
          Name, Workflow States and archiving for {project.name}.
        </p>
      </div>
      <SettingsSection title="General">
        <GeneralForm project={project} />
      </SettingsSection>
      <SettingsSection
        title="Workflow States"
        description="Board columns follow State Category order, then the order you set inside each category."
      >
        <WorkflowStatesEditor project={project} />
      </SettingsSection>
      <ArchiveSection project={project} />
    </SettingsPage>
  );
};

export const Route = createFileRoute("/_app/projects/$prefix/settings")({
  beforeLoad: ({ context: { me }, params }) => {
    if (me.role !== "admin") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing.
      throw redirect({ to: "/projects/$prefix/board", params });
    }
  },
  loader: async ({
    context: { orpc: api, queryClient },
    params: { prefix },
  }) => {
    const project = await queryClient.query({
      ...api.projects.get.queryOptions({ input: { prefix } }),
      staleTime: "static",
    });

    return { projectName: project.name };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `Settings · ${loaderData?.projectName ?? "Project"}` }],
  }),
  component: SettingsRoute,
});
