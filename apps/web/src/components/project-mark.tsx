import { cn } from "@helios/ui/lib/utils";

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

export const HeliosMark = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={cn(
      "bg-primary text-primary-foreground grid size-5 place-items-center rounded-sm text-xs font-bold",
      className
    )}
  >
    H
  </span>
);
