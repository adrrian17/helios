import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/projects/$prefix/")({
  beforeLoad: ({ params }) => {
    // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing.
    throw redirect({ to: "/projects/$prefix/board", params, replace: true });
  },
});
