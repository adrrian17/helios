import { Button } from "@helios/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@helios/ui/components/empty";
import { Link, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { CircleAlertIcon, SearchXIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";

export const RouteError = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter();

  return (
    <>
      <PageHeader />
      <main className="grid flex-1 place-items-center overflow-y-auto p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <EmptyDescription>
              {error instanceof Error ? error.message : "Unexpected error."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              onClick={() => {
                reset();
                void router.invalidate();
              }}
            >
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    </>
  );
};

export const NotFound = ({ what = "page" }: { what?: string }) => (
  <>
    <PageHeader />
    <main className="grid flex-1 place-items-center overflow-y-auto p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>No such {what}</EmptyTitle>
          <EmptyDescription>
            It may have been removed, or the link is mistyped.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/" />} nativeButton={false}>
            Go home
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  </>
);
