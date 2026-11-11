import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@helios/ui/components/empty";
import { HammerIcon } from "lucide-react";

/** Stands in for a screen a later slice of Helios v1 builds. */
export const ComingSoon = ({ title }: { title: string }) => (
  <main className="grid flex-1 place-items-center overflow-y-auto p-4">
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HammerIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>This view is on its way.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  </main>
);
