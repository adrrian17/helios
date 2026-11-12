import { SidebarInset, SidebarProvider } from "@helios/ui/components/sidebar";
import { ORPCError } from "@orpc/client";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { CommandsProvider, CreateIssueFab } from "@/components/commands";
import { RouteError } from "@/components/route-states";

const AppLayout = () => (
  <SidebarProvider>
    <CommandsProvider>
      <a
        href="#main"
        className="bg-background focus-visible:ring-ring fixed top-2 left-2 z-50 -translate-y-16 rounded-md border px-3 py-2 text-sm font-medium focus-visible:translate-y-0 focus-visible:ring-2"
        onClick={(event) => {
          // Each page renders its own <main id="main">; focusing it keeps the URL free of a hash.
          event.preventDefault();
          const main = document.querySelector<HTMLElement>("#main");
          main?.setAttribute("tabindex", "-1");
          main?.focus();
        }}
      >
        Skip to content
      </a>
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
