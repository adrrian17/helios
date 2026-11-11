import { Button } from "@helios/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@helios/ui/components/dropdown-menu";
import { Spinner } from "@helios/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CirclePlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SignalIcon,
  TagIcon,
  TrashIcon,
  TypeIcon,
  UserRoundIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ConfirmRequest } from "@/components/confirm-dialog";
import { MemberAvatar, RelativeTime } from "@/components/issue-meta";
import { useIssue } from "@/components/issue/use-issue";
import { Markdown, MarkdownEditor } from "@/components/markdown";
import type { TimelineEntry } from "@/utils/domain";
import { orpc } from "@/utils/orpc";
import { submitKeys } from "@/utils/shortcuts";
import { useMe } from "@/utils/use-me";

type ActivityEntry = Extract<TimelineEntry, { type: "activity" }>;

type CommentEntry = Extract<TimelineEntry, { type: "comment" }>;

const Value = ({ children }: { children: React.ReactNode }) => (
  <span className="text-foreground font-medium">{children}</span>
);

const Change = ({ entry }: { entry: ActivityEntry }) => (
  <>
    <Value>{entry.oldValue}</Value>
    <ArrowRightIcon aria-hidden="true" className="mx-1 inline size-3" />
    <span className="sr-only">{" to "}</span>
    <Value>{entry.newValue}</Value>
  </>
);

/** What each kind of Activity says and the icon beside it. */
const activityCopy: Record<
  ActivityEntry["kind"],
  { icon: LucideIcon; describe: (entry: ActivityEntry) => React.ReactNode }
> = {
  created: { icon: CirclePlusIcon, describe: () => "created the Issue" },
  title_changed: {
    icon: TypeIcon,
    describe: (entry) => (
      <>
        renamed the Issue from <Change entry={entry} />
      </>
    ),
  },
  state_changed: {
    icon: ArrowRightIcon,
    describe: (entry) => (
      <>
        moved it <span className="sr-only">from </span>
        <Change entry={entry} />
      </>
    ),
  },
  priority_changed: {
    icon: SignalIcon,
    describe: (entry) => (
      <>
        changed Priority from <Change entry={entry} />
      </>
    ),
  },
  assignee_changed: {
    icon: UserRoundIcon,
    describe: (entry) => {
      if (entry.newValue === null) {
        return (
          <>
            unassigned <Value>{entry.oldValue}</Value>
          </>
        );
      }

      return entry.oldValue === null ? (
        <>
          assigned it to <Value>{entry.newValue}</Value>
        </>
      ) : (
        <>
          reassigned it from <Change entry={entry} />
        </>
      );
    },
  },
  label_added: {
    icon: TagIcon,
    describe: (entry) => (
      <>
        added the Label <Value>{entry.newValue}</Value>
      </>
    ),
  },
  label_removed: {
    icon: TagIcon,
    describe: (entry) => (
      <>
        removed the Label <Value>{entry.oldValue}</Value>
      </>
    ),
  },
};

const ActivityItem = ({ entry }: { entry: ActivityEntry }) => {
  const { icon: Icon, describe } = activityCopy[entry.kind];

  return (
    <li className="text-muted-foreground flex items-start gap-3 py-1.5 text-xs leading-5">
      <span className="bg-background ring-border relative z-10 grid size-5 shrink-0 place-items-center rounded-full ring-1">
        <Icon aria-hidden="true" className="size-3" />
      </span>
      <p className="min-w-0 flex-1 text-pretty">
        <Value>{entry.actor.displayName}</Value> {describe(entry)}
        <span aria-hidden="true"> · </span>
        <RelativeTime date={entry.createdAt} />
      </p>
    </li>
  );
};

const CommentItem = ({
  entry,
  onDelete,
}: {
  entry: CommentEntry;
  onDelete: (request: ConfirmRequest) => void;
}) => {
  const me = useMe();
  const [draft, setDraft] = useState<string | null>(null);
  // Set at once on send; `isPending` only arrives with the next render, after a fast second ⌘↵.
  const sending = useRef(false);
  const own = entry.author.id === me.id;
  const canDelete = own || me.role === "admin";

  const edit = useMutation({
    ...orpc.comments.edit.mutationOptions(),
    onSuccess: () => {
      setDraft(null);
    },
    onSettled: () => {
      sending.current = false;
    },
  });

  const remove = useMutation(orpc.comments.delete.mutationOptions());

  const save = () => {
    if (!sending.current && draft !== null && draft.trim() !== "") {
      sending.current = true;
      edit.mutate({ id: entry.id, body: draft });
    }
  };

  return (
    <li className="flex items-start gap-3 py-2">
      <MemberAvatar member={entry.author} className="relative z-10" />
      <article
        aria-label={`Comment by ${entry.author.displayName}`}
        className="bg-card min-w-0 flex-1 rounded-lg border"
      >
        <header className="flex h-9 items-center gap-1.5 pr-1 pl-3 text-xs">
          <span className="truncate font-medium">
            {entry.author.displayName}
          </span>
          <RelativeTime
            date={entry.createdAt}
            className="text-muted-foreground shrink-0"
          />
          {entry.editedAt === null ? null : (
            <span className="text-muted-foreground shrink-0">(edited)</span>
          )}
          <span className="flex-1" />
          {canDelete && draft === null ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="muted"
                    size="icon-xs"
                    aria-label={`Actions for the Comment by ${entry.author.displayName}`}
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36">
                <DropdownMenuGroup>
                  {own ? (
                    <DropdownMenuItem
                      onClick={() => {
                        setDraft(entry.body);
                      }}
                    >
                      <PencilIcon />
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      onDelete({
                        title: "Delete this Comment?",
                        description: own
                          ? "It is removed for everyone. This can’t be undone."
                          : `${entry.author.displayName}’s Comment is removed for everyone. This can’t be undone.`,
                        confirmLabel: "Delete Comment",
                        destructive: true,
                        onConfirm: async () => {
                          await remove.mutateAsync({ id: entry.id });
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
          ) : null}
        </header>
        {draft === null ? (
          <Markdown className="px-3 pb-3">{entry.body}</Markdown>
        ) : (
          <div className="flex flex-col gap-2 px-3 pb-3">
            <MarkdownEditor
              label="Edit Comment"
              autoFocus
              value={draft}
              onChange={setDraft}
              onSubmit={save}
              onCancel={() => {
                setDraft(null);
              }}
            />
            <div className="flex justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={edit.isPending || draft.trim() === ""}
                onClick={save}
              >
                {edit.isPending ? <Spinner data-icon="inline-start" /> : null}
                Save
              </Button>
            </div>
          </div>
        )}
      </article>
    </li>
  );
};

const CommentComposer = ({ issueId }: { issueId: string }) => {
  const me = useMe();
  const [body, setBody] = useState("");
  // See CommentItem: guards a second ⌘↵ before `isPending` renders.
  const sending = useRef(false);

  const add = useMutation({
    ...orpc.comments.add.mutationOptions(),
    onSuccess: () => {
      setBody("");
    },
    onSettled: () => {
      sending.current = false;
    },
  });

  const submit = () => {
    if (!sending.current && body.trim() !== "") {
      sending.current = true;
      add.mutate({ issueId, body });
    }
  };

  return (
    <div className="flex items-start gap-3 pt-2">
      <MemberAvatar
        member={{
          id: me.id,
          displayName: me.name.trim() === "" ? me.email : me.name,
        }}
        className="relative z-10"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <MarkdownEditor
          label="Comment"
          placeholder="Leave a Comment…"
          value={body}
          onChange={setBody}
          onSubmit={submit}
        />
        <div className="flex items-center justify-end gap-2">
          <span className="text-muted-foreground mr-auto text-xs max-md:hidden">
            Markdown supported · {submitKeys()} to send
          </span>
          <Button
            size="sm"
            disabled={add.isPending || body.trim() === ""}
            onClick={submit}
          >
            {add.isPending ? <Spinner data-icon="inline-start" /> : null}
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
};

/** Activity and Comments in one list, oldest first, ending with the Comment box. */
export const IssueTimeline = () => {
  const issue = useIssue();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  return (
    <section aria-labelledby="activity-heading" className="flex flex-col gap-2">
      <h2 id="activity-heading" className="text-sm font-medium">
        Activity
      </h2>
      <div className="relative">
        {/* The thread line behind the icons and avatars. */}
        <span
          aria-hidden="true"
          className="bg-border absolute top-3 bottom-8 left-2.5 w-px"
        />
        <ol aria-label="Activity and Comments" className="flex flex-col">
          {issue.timeline.map((entry) =>
            entry.type === "activity" ? (
              <ActivityItem key={`activity-${entry.id}`} entry={entry} />
            ) : (
              <CommentItem
                key={`comment-${entry.id}`}
                entry={entry}
                onDelete={setConfirm}
              />
            )
          )}
        </ol>
        <CommentComposer issueId={issue.id} />
      </div>
      <ConfirmDialog
        request={confirm}
        pending={false}
        onClose={() => {
          setConfirm(null);
        }}
      />
    </section>
  );
};
