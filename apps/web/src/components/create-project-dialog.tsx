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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@helios/ui/components/field";
import { Input } from "@helios/ui/components/input";
import { Spinner } from "@helios/ui/components/spinner";
import { ORPCError } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { PREFIX_PATTERN, suggestPrefix } from "@/utils/domain";
import { describeError, orpc } from "@/utils/orpc";

const CreateProjectForm = ({ onDone }: { onDone: () => void }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  // Once the prefix is typed by hand, renaming no longer overwrites it.
  const prefixEdited = useRef(false);
  const [submitted, setSubmitted] = useState(false);

  const create = useMutation({
    ...orpc.projects.create.mutationOptions(),
    meta: { inlineError: true },
    onSuccess: async (project) => {
      onDone();
      await navigate({
        to: "/projects/$prefix/board",
        params: { prefix: project.prefix },
      });
    },
  });

  const prefixInvalid = submitted && !PREFIX_PATTERN.test(prefix);
  const nameInvalid = submitted && name.trim() === "";

  const conflict =
    create.error instanceof ORPCError && create.error.code === "CONFLICT"
      ? create.error.message
      : undefined;

  const otherError =
    create.error !== null && conflict === undefined
      ? describeError(create.error)
      : undefined;

  return (
    <form
      noValidate
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);

        if (name.trim() !== "" && PREFIX_PATTERN.test(prefix)) {
          create.mutate({ name: name.trim(), prefix });
        }
      }}
    >
      <FieldGroup>
        <Field data-invalid={nameInvalid || undefined}>
          <FieldLabel htmlFor="project-name">Name</FieldLabel>
          <Input
            id="project-name"
            autoComplete="off"
            placeholder="Helios"
            aria-invalid={nameInvalid || undefined}
            value={name}
            onChange={(event) => {
              setName(event.target.value);

              if (!prefixEdited.current) {
                setPrefix(suggestPrefix(event.target.value));
              }
            }}
          />
          {nameInvalid ? (
            <FieldError>Give the Project a name.</FieldError>
          ) : null}
        </Field>
        <Field
          data-invalid={prefixInvalid || conflict !== undefined || undefined}
        >
          <FieldLabel htmlFor="project-prefix">Identifier prefix</FieldLabel>
          <Input
            id="project-prefix"
            autoComplete="off"
            spellCheck={false}
            maxLength={5}
            placeholder="HEL"
            aria-invalid={prefixInvalid || conflict !== undefined || undefined}
            aria-describedby="project-prefix-help"
            value={prefix}
            onChange={(event) => {
              prefixEdited.current = true;
              setPrefix(
                event.target.value.toUpperCase().replaceAll(/[^A-Z]/gu, "")
              );
              create.reset();
            }}
          />
          <FieldDescription id="project-prefix-help">
            2 to 5 letters. Issues get Identifiers like{" "}
            <span className="font-mono">
              {PREFIX_PATTERN.test(prefix) ? prefix : "HEL"}-1
            </span>
            . The prefix can’t change later.
          </FieldDescription>
          {prefixInvalid ? (
            <FieldError>Use 2 to 5 letters, A to Z.</FieldError>
          ) : null}
          {conflict === undefined ? null : <FieldError>{conflict}</FieldError>}
        </Field>
        {otherError === undefined ? null : (
          <p role="alert" className="text-destructive text-sm">
            {otherError}
          </p>
        )}
      </FieldGroup>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? <Spinner data-icon="inline-start" /> : null}
          Create Project
        </Button>
      </DialogFooter>
    </form>
  );
};

export const CreateProjectDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New Project</DialogTitle>
        <DialogDescription>
          It starts with five Workflow States: Ideas, Backlog, In Progress, Done
          and Cancelled.
        </DialogDescription>
      </DialogHeader>
      <CreateProjectForm
        onDone={() => {
          onOpenChange(false);
        }}
      />
    </DialogContent>
  </Dialog>
);
