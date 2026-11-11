import { cn } from "@helios/ui/lib/utils";

/** The Project's prefix initial on a tinted square, so Projects are told apart at a glance. */
export const ProjectMark = ({
  project,
  className,
}: {
  project: { prefix: string };
  className?: string;
}) => (
  <span
    aria-hidden="true"
    className={cn(
      "bg-sidebar-accent text-sidebar-accent-foreground ring-sidebar-border grid size-4 shrink-0 place-items-center rounded-xs font-mono text-xs font-semibold ring-1",
      className
    )}
  >
    {project.prefix.slice(0, 1)}
  </span>
);
