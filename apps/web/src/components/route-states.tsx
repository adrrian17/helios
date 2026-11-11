import { Button } from "@helios/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@helios/ui/components/empty";
import { cn } from "@helios/ui/lib/utils";
import { Link, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { CircleAlertIcon, SearchXIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { HeliosMark } from "@/components/project-mark";
import { describeError } from "@/utils/orpc";

/** `bare` drops the page header, whose sidebar button needs the signed-in shell, for states rendered outside it. */
const StatePage = ({
  bare,
  children,
}: {
  bare: boolean;
  children: React.ReactNode;
}) => (
  <>
    {bare ? null : <PageHeader />}
    <main
      className={cn(
        "flex flex-col items-center justify-center gap-6 p-4",
        bare ? "min-h-svh" : "flex-1 overflow-y-auto"
      )}
    >
      {bare ? (
        <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <HeliosMark className="size-7 rounded-md text-sm" />
          Helios
        </p>
      ) : null}
      {children}
    </main>
  </>
);

export const RouteError = ({
  error,
  reset,
  bare = false,
}: ErrorComponentProps & { bare?: boolean }) => {
  const router = useRouter();

  return (
    <StatePage bare={bare}>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            {error instanceof Error
              ? describeError(error)
              : "Unexpected error."}
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
    </StatePage>
  );
};

export const NotFound = ({
  what = "page",
  bare = false,
}: {
  what?: string;
  bare?: boolean;
}) => (
  <StatePage bare={bare}>
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
  </StatePage>
);
