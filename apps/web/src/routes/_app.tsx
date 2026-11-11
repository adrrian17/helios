import { SidebarInset, SidebarProvider } from "@helios/ui/components/sidebar";
import { ORPCError } from "@orpc/client";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { CommandsProvider, CreateIssueFab } from "@/components/commands";
import { RouteError } from "@/components/route-states";

const AppLayout = () => (
  <SidebarProvider>
    <CommandsProvider>
      <AppSidebar />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        <Outlet />
      </SidebarInset>
      <CreateIssueFab />
    </CommandsProvider>
  </SidebarProvider>
);

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context: { orpc, queryClient } }) => {
    try {
      return {
        me: await queryClient.query({
          ...orpc.me.queryOptions(),
          staleTime: "static",
        }),
      };
    } catch (error) {
      if (error instanceof ORPCError && error.code === "UNAUTHORIZED") {
        // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects by throwing.
        throw redirect({ to: "/sign-in" });
      }

      throw error;
    }
  },
  component: AppLayout,
  errorComponent: (props) => <RouteError {...props} bare />,
});
