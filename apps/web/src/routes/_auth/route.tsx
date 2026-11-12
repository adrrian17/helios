import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

const AuthLayout = () => <Outlet />;

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing its redirect object.
      throw redirect({
        to: "/login",
      });
    }

    return { session };
  },
});
