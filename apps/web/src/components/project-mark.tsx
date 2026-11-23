import { cn } from "@helios/ui/lib/utils";

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

/** A Project's initial on a tinted square, so Project rows line up with icon rows. */
export const ProjectMark = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => (
  <span
    aria-hidden="true"
    className={cn(
      "bg-background text-muted-foreground ring-border grid size-4 shrink-0 place-items-center rounded-sm text-xs leading-none font-semibold ring-1",
      className
    )}
  >
    {name.trim().charAt(0).toUpperCase()}
  </span>
);
