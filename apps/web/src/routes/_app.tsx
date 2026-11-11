import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@helios/ui/components/sidebar";
import { ORPCError } from "@orpc/client";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";

const AppLayout = () => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset className="min-w-0">
      <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
        <SidebarTrigger aria-label="Open navigation" className="size-11" />
        <span className="font-semibold">Helios</span>
      </header>
      <Outlet />
    </SidebarInset>
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
});
