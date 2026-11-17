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
