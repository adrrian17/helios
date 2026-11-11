import { Button } from "@helios/ui/components/button";
import { Spinner } from "@helios/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { PencilIcon } from "lucide-react";
import { useState } from "react";

import { useIssue } from "@/components/issue/use-issue";
import { Markdown, MarkdownEditor } from "@/components/markdown";
import { orpc } from "@/utils/orpc";

/** The title as a borderless field: Enter or leaving it saves, Escape puts it back. */
export const IssueTitle = () => {
  const issue = useIssue();
  // Null until edited, so a rename elsewhere shows through.
  const [draft, setDraft] = useState<string | null>(null);
  const update = useMutation(orpc.issues.update.mutationOptions());

  const save = () => {
    const title = draft?.trim() ?? "";

    if (draft !== null && title !== "" && title !== issue.title) {
      update.mutate(
        { id: issue.id, title },
        {
          onSettled: () => {
            setDraft(null);
          },
        }
      );
    } else {
      setDraft(null);
    }
  };

  return (
    <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
      <textarea
        aria-label="Title"
        rows={1}
        maxLength={500}
        className="focus-visible:bg-muted/40 -mx-1 field-sizing-content w-full resize-none rounded-md bg-transparent px-1 py-0.5 text-pretty outline-none"
        value={draft ?? issue.title}
        onChange={(event) => {
          setDraft(event.target.value.replaceAll("\n", " "));
        }}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }

          if (event.key === "Escape") {
            setDraft(null);
          }
        }}
      />
    </h1>
  );
};

export const IssueDescription = () => {
  const issue = useIssue();
  const [draft, setDraft] = useState<string | null>(null);

  const update = useMutation({
    ...orpc.issues.update.mutationOptions(),
    onSuccess: () => {
      setDraft(null);
    },
  });

  if (draft !== null) {
    const save = () => {
      update.mutate({ id: issue.id, description: draft });
    };

    return (
      <section aria-label="Description" className="flex flex-col gap-2">
        <MarkdownEditor
          label="Description"
          autoFocus
          placeholder="Add a description. Markdown works: **bold**, - lists, `code`, [links](https://…)."
          value={draft}
          onChange={setDraft}
          onSubmit={save}
          onCancel={() => {
            setDraft(null);
          }}
        />
        <div className="flex items-center justify-end gap-1.5">
          <span className="text-muted-foreground mr-auto text-xs max-sm:hidden">
            Markdown supported · ⌘↵ to save
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(null);
            }}
          >
            Cancel
          </Button>
          <Button size="sm" disabled={update.isPending} onClick={save}>
            {update.isPending ? <Spinner data-icon="inline-start" /> : null}
            Save
          </Button>
        </div>
      </section>
    );
  }

  if (issue.description.trim() === "") {
    return (
      <Button
        variant="muted"
        className="-ml-2.5 self-start"
        onClick={() => {
          setDraft("");
        }}
      >
        Add a description…
      </Button>
    );
  }

  return (
    <section aria-label="Description" className="group/description relative">
      <Markdown className="pr-10">{issue.description}</Markdown>
      <span className="absolute top-0 right-0 md:opacity-0 md:group-hover/description:opacity-100 md:focus-within:opacity-100">
        <Button
          variant="muted"
          size="icon-sm"
          aria-label="Edit description"
          onClick={() => {
            setDraft(issue.description);
          }}
        >
          <PencilIcon />
        </Button>
      </span>
    </section>
  );
};
