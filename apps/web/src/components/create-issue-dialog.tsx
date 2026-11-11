import { Button } from "@helios/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@helios/ui/components/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@helios/ui/components/field";
import { Input } from "@helios/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@helios/ui/components/select";
import { Spinner } from "@helios/ui/components/spinner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ProjectMark } from "@/components/project-mark";
import type { ProjectSummary } from "@/utils/domain";
import { orpc } from "@/utils/orpc";

const CreateIssueForm = ({
  projects,
  prefix,
  title,
  onTitleChange,
  onDone,
}: {
  projects: ProjectSummary[];
  prefix: string | undefined;
  title: string;
  onTitleChange: (title: string) => void;
  onDone: () => void;
}) => {
  const navigate = useNavigate();

  const [projectId, setProjectId] = useState(
    () =>
      (projects.find((project) => project.prefix === prefix) ?? projects[0])
        ?.id ?? null
  );

  const [submitted, setSubmitted] = useState(false);
  const titleInvalid = submitted && title.trim() === "";
  const create = useMutation(orpc.issues.create.mutationOptions());

  if (projectId === null) {
    return (
      <>
        <p className="text-muted-foreground">
          There is no active Project to add it to yet. An Admin can create one
          from the sidebar.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  const items = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));

  return (
    <form
      noValidate
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);

        if (title.trim() === "") {
          return;
        }

        create.mutate(
          { projectId, title: title.trim() },
          {
            onSuccess: ({ identifier }) => {
              onTitleChange("");
              onDone();
              toast.success(`${identifier} created.`, {
                action: {
                  label: "Open",
                  onClick: () => {
                    void navigate({
                      to: "/issue/$identifier",
                      params: { identifier },
                    });
                  },
                },
              });
            },
          }
        );
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="new-issue-project">Project</FieldLabel>
          <Select
            items={items}
            value={projectId}
            onValueChange={(value) => {
              if (value !== null) {
                setProjectId(value);
              }
            }}
          >
            <SelectTrigger id="new-issue-project" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <ProjectMark project={project} />
                    {project.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={titleInvalid || undefined}>
          <FieldLabel htmlFor="new-issue-title">Title</FieldLabel>
          <Input
            id="new-issue-title"
            autoFocus
            autoComplete="off"
            placeholder="What needs doing?"
            aria-invalid={titleInvalid || undefined}
            value={title}
            onChange={(event) => {
              onTitleChange(event.target.value);
            }}
          />
          {titleInvalid ? (
            <FieldError>Give the Issue a title.</FieldError>
          ) : null}
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? <Spinner data-icon="inline-start" /> : null}
          Create Issue
        </Button>
      </DialogFooter>
    </form>
  );
};

/** A new Issue from anywhere: pick the Project (the current one by default) and give it a title. */
export const CreateIssueDialog = ({
  open,
  prefix,
  onClose,
}: {
  open: boolean;
  prefix: string | undefined;
  onClose: () => void;
}) => {
  const projects = useQuery(orpc.projects.list.queryOptions());
  // Kept here, outside the form that unmounts on close, so a dismissed title comes back.
  const [title, setTitle] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Issue</DialogTitle>
          <DialogDescription>
            It lands in the Project’s first backlog Workflow State.
          </DialogDescription>
        </DialogHeader>
        {projects.data === undefined ? (
          <Spinner aria-label="Loading Projects" className="mx-auto my-4" />
        ) : (
          <CreateIssueForm
            projects={projects.data}
            prefix={prefix}
            title={title}
            onTitleChange={setTitle}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
