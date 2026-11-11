import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@helios/ui/components/empty";
import { createFileRoute } from "@tanstack/react-router";

const HomeComponent = () => (
  <main className="grid flex-1 place-items-center p-4">
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No Projects yet</EmptyTitle>
        <EmptyDescription>
          Projects appear in the sidebar once an Admin creates one.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  </main>
);

export const Route = createFileRoute("/_app/")({
  component: HomeComponent,
});
