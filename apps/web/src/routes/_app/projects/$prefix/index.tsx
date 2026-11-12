import { createFileRoute, redirect } from "@tanstack/react-router";

import { rememberedView } from "@/utils/project-view";

export const Route = createFileRoute("/_app/projects/$prefix/")({
  beforeLoad: ({ params, search }) => {
    // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing.
    throw redirect({
      to:
        rememberedView(params.prefix) === "list"
          ? "/projects/$prefix/list"
          : "/projects/$prefix/board",
      params,
      search,
      replace: true,
    });
  },
});
