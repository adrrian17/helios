import { Avatar, AvatarFallback } from "@helios/ui/components/avatar";
import { cn } from "@helios/ui/lib/utils";
import { UserRoundIcon } from "lucide-react";

import type { MemberSummary, StateCategory } from "@/utils/domain";
import { formatDateTime, formatRelative } from "@/utils/format";

const ICON = "size-3.5 shrink-0";
const CIRCLE = { cx: 7, cy: 7, r: 6, fill: "none", strokeWidth: 1.5 } as const;

const categoryColor: Record<StateCategory, string> = {
  ideas: "text-state-ideas",
  backlog: "text-state-backlog",
  started: "text-state-started",
  completed: "text-state-completed",
  cancelled: "text-state-cancelled",
};

const categoryGlyph: Record<StateCategory, React.ReactNode> = {
  ideas: <circle {...CIRCLE} stroke="currentColor" strokeDasharray="2 2" />,
  backlog: <circle {...CIRCLE} stroke="currentColor" />,
  started: (
    <>
      <circle {...CIRCLE} stroke="currentColor" />
      <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" />
    </>
  ),
  completed: (
    <>
      <circle cx="7" cy="7" r="7" fill="currentColor" />
      <path
        d="m4.25 7.25 1.9 1.9 3.6-3.9"
        fill="none"
        stroke="var(--background)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  cancelled: (
    <>
      <circle cx="7" cy="7" r="7" fill="currentColor" />
      <path
        d="m4.75 4.75 4.5 4.5m0-4.5-4.5 4.5"
        stroke="var(--background)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
};

/** Linear-style glyph for a State Category; decorative, since a name always sits beside it. */
export const StateIcon = ({
  category,
  className,
}: {
  category: StateCategory;
  className?: string;
}) => (
  <svg
    viewBox="0 0 14 14"
    aria-hidden="true"
    className={cn(ICON, categoryColor[category], className)}
  >
    {categoryGlyph[category]}
  </svg>
);

const HUE_COUNT = 360;
const HUE_SEED = 31;

const hueOf = (id: string) => {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * HUE_SEED + (id.codePointAt(index) ?? 0)) % HUE_COUNT;
  }

  return hash;
};

const initialsOf = (name: string) => {
  const [local = ""] = name.split("@");
  const [first = "", second = ""] = local.split(/[\s._-]+/u).filter(Boolean);

  return (
    second === "" ? first.slice(0, 2) : `${first[0]}${second[0]}`
  ).toUpperCase();
};

export const MemberAvatar = ({
  member,
  size = "xs",
  className,
}: {
  member: Pick<MemberSummary, "id" | "displayName">;
  size?: "xs" | "sm" | "default";
  className?: string;
}) => (
  // Decorative: a name always sits beside it or is spoken separately.
  <Avatar size={size} className={className} aria-hidden="true">
    <AvatarFallback colored style={{ "--avatar-hue": hueOf(member.id) }}>
      {initialsOf(member.displayName)}
    </AvatarFallback>
  </Avatar>
);

export const UnassignedAvatar = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={cn(
      "text-muted-foreground grid size-5 shrink-0 place-items-center rounded-full border border-dashed",
      className
    )}
  >
    <UserRoundIcon className="size-3" />
  </span>
);

export const RelativeTime = ({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) => (
  <time
    dateTime={date.toISOString()}
    title={formatDateTime(date)}
    className={className}
  >
    {formatRelative(date)}
  </time>
);
