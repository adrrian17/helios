import { Button } from "@helios/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@helios/ui/components/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@helios/ui/components/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@helios/ui/components/field";
import { Input } from "@helios/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@helios/ui/components/popover";
import { Skeleton } from "@helios/ui/components/skeleton";
import { Spinner } from "@helios/ui/components/spinner";
import { cn } from "@helios/ui/lib/utils";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TagIcon,
  TrashIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ConfirmRequest } from "@/components/confirm-dialog";
import { LabelDot } from "@/components/issue-meta";
import { PageHeader, PageTitle } from "@/components/page-header";
import {
  SettingsList,
  SettingsPage,
  SettingsSection,
} from "@/components/settings-section";
import { labelColors } from "@/utils/domain";
import type { Label } from "@/utils/domain";
import { describeError, orpc } from "@/utils/orpc";

const NAME_LIMIT = 120;

const colorName = (value: string) =>
  labelColors.find((color) => color.value === value.toLowerCase())?.name ??
  value;

/** The preset palette as native radios drawn as swatches; one is always chosen. */
const ColorSwatches = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) => {
  const name = useId();

  return (
    <fieldset className="flex min-w-0 flex-wrap gap-1">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {labelColors.map((color) => {
        const checked = color.value === value.toLowerCase();

        return (
          <label
            key={color.value}
            className="hover:bg-muted has-focus-visible:ring-ring grid size-7 cursor-pointer place-items-center rounded-md has-focus-visible:ring-3 max-md:size-11"
          >
            <input
              type="radio"
              name={name}
              value={color.value}
              checked={checked}
              aria-label={color.name}
              className="sr-only"
              onChange={() => {
                onChange(color.value);
              }}
            />
            <span
              aria-hidden="true"
              className={cn(
                "grid size-4.5 place-items-center rounded-full bg-(--swatch) text-white",
                checked &&
                  "ring-foreground ring-offset-background ring-2 ring-offset-1"
              )}
              style={{ "--swatch": color.value }}
            >
              {checked ? <CheckIcon className="size-3" /> : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
};

const CreateLabelForm = ({ count }: { count: number }) => {
  const [name, setName] = useState("");

  // Suggest the next colour in the palette, so neighbouring Labels differ.
  const [color, setColor] = useState<string>(
    (labelColors[count % labelColors.length] ?? labelColors[0]).value
  );

  const create = useMutation({
    ...orpc.labels.create.mutationOptions(),
    meta: { inlineError: true },
    onSuccess: (label, { name: sent }) => {
      toast.success(`Label ${label.name} created.`);
      setName((current) => (current.trim() === sent ? "" : current));
      setColor(
        (labelColors[(count + 1) % labelColors.length] ?? labelColors[0]).value
      );
    },
  });

  const error = create.error === null ? undefined : describeError(create.error);

  return (
    <form
      className="bg-card flex flex-col gap-4 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (name.trim() !== "") {
          create.mutate({ name: name.trim(), color });
        }
      }}
    >
      <FieldGroup>
        <Field data-invalid={error !== undefined || undefined}>
          <FieldLabel htmlFor="label-name">Name</FieldLabel>
          <Input
            id="label-name"
            autoComplete="off"
            maxLength={NAME_LIMIT}
            placeholder="Bug"
            aria-invalid={error !== undefined || undefined}
            value={name}
            onChange={(event) => {
              setName(event.target.value);

              if (create.isError) {
                create.reset();
              }
            }}
          />
          {error === undefined ? null : <FieldError>{error}</FieldError>}
        </Field>
        <ColorSwatches label="Colour" value={color} onChange={setColor} />
      </FieldGroup>
      <Button
        type="submit"
        className="self-end max-sm:self-stretch"
        disabled={create.isPending || name.trim() === ""}
      >
        {create.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <LabelDot color={color} />
        )}
        Create Label
      </Button>
    </form>
  );
};

const RenameForm = ({
  label,
  onDone,
}: {
  label: Label;
  onDone: () => void;
}) => {
  // Null until edited, so a rename elsewhere shows through.
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? label.name;

  const rename = useMutation({
    ...orpc.labels.update.mutationOptions(),
    meta: { inlineError: true },
    onSuccess: onDone,
  });

  return (
    <form
      className="flex min-w-0 flex-1 flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault();

        if (name.trim() === label.name) {
          onDone();
        } else if (name.trim() !== "") {
          rename.mutate({ id: label.id, name: name.trim() });
        }
      }}
    >
      <div className="flex items-center gap-1.5 max-sm:flex-wrap">
        <Input
          aria-label={`New name for ${label.name}`}
          autoFocus
          autoComplete="off"
          maxLength={NAME_LIMIT}
          aria-invalid={rename.error === null ? undefined : true}
          className="min-w-0 flex-1"
          // The form closes on success, so nothing typed after Save may be lost.
          readOnly={rename.isPending}
          value={name}
          onChange={(event) => {
            setDraft(event.target.value);

            if (rename.isError) {
              rename.reset();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onDone();
            }
          }}
        />
        <Button
          type="submit"
          size="sm"
          disabled={rename.isPending || name.trim() === ""}
        >
          {rename.isPending ? <Spinner data-icon="inline-start" /> : null}
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {rename.error === null ? null : (
        <p role="alert" className="text-destructive text-sm">
          {describeError(rename.error)}
        </p>
      )}
    </form>
  );
};

const LabelRow = ({
  label,
  onDelete,
}: {
  label: Label;
  onDelete: (request: ConfirmRequest) => void;
}) => {
  const [renaming, setRenaming] = useState(false);
  const recolor = useMutation(orpc.labels.update.mutationOptions());
  const remove = useMutation(orpc.labels.delete.mutationOptions());

  const color =
    recolor.isPending && recolor.variables.color !== undefined
      ? recolor.variables.color
      : label.color;

  return (
    <li
      className="flex min-h-12 items-center gap-2 py-1.5 pr-1.5 pl-2"
      data-label={label.name}
    >
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Colour of ${label.name}: ${colorName(color)}`}
            />
          }
        >
          <LabelDot color={color} className="size-3" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto">
          <ColorSwatches
            label={`Colour of ${label.name}`}
            value={color}
            onChange={(value) => {
              recolor.mutate({ id: label.id, color: value });
            }}
          />
        </PopoverContent>
      </Popover>
      {renaming ? (
        <RenameForm
          label={label}
          onDone={() => {
            setRenaming(false);
          }}
        />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-sm">{label.name}</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${label.name}`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => {
                    setRenaming(true);
                  }}
                >
                  <PencilIcon />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    onDelete({
                      title: `Delete ${label.name}?`,
                      description:
                        "It is removed from every Issue in every Project. This can’t be undone.",
                      confirmLabel: "Delete Label",
                      destructive: true,
                      onConfirm: async () => {
                        await remove.mutateAsync({ id: label.id });
                        toast.success(`Label ${label.name} deleted.`);
                      },
                    });
                  }}
                >
                  <TrashIcon />
                  Delete…
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </li>
  );
};

const LabelsPage = () => {
  const { data: labels } = useSuspenseQuery(orpc.labels.list.queryOptions());
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  return (
    <>
      <PageHeader>
        <PageTitle>Labels</PageTitle>
      </PageHeader>
      <SettingsPage>
        <SettingsSection
          title="New Label"
          description="Labels are shared by every Project. Names are unique, ignoring case."
        >
          <CreateLabelForm count={labels.length} />
        </SettingsSection>
        <SettingsSection title={`Labels · ${labels.length}`}>
          {labels.length === 0 ? (
            <div className="rounded-lg border">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <TagIcon />
                  </EmptyMedia>
                  <EmptyTitle>No Labels yet</EmptyTitle>
                  <EmptyDescription>
                    Create one above, or straight from an Issue’s Labels picker.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <SettingsList label="Labels">
              {labels.map((label) => (
                <LabelRow key={label.id} label={label} onDelete={setConfirm} />
              ))}
            </SettingsList>
          )}
        </SettingsSection>
      </SettingsPage>
      <ConfirmDialog
        request={confirm}
        pending={false}
        onClose={() => {
          setConfirm(null);
        }}
      />
    </>
  );
};

const LabelsSkeleton = () => (
  <>
    <PageHeader>
      <PageTitle>Labels</PageTitle>
    </PageHeader>
    <SettingsPage>
      <output aria-busy="true" aria-label="Loading Labels">
        <Skeleton className="h-40" />
      </output>
    </SettingsPage>
  </>
);

export const Route = createFileRoute("/_app/labels")({
  loader: async ({ context: { orpc: api, queryClient } }) => {
    await queryClient.query({
      ...api.labels.list.queryOptions(),
      staleTime: "static",
    });
  },
  head: () => ({ meta: [{ title: "Labels" }] }),
  pendingComponent: LabelsSkeleton,
  component: LabelsPage,
});
