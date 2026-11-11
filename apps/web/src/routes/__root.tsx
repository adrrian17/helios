import { Toaster } from "@helios/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";

import { NotFound } from "@/components/route-states";
import { ThemeProvider } from "@/components/theme-provider";
import type { orpc } from "@/utils/orpc";

import "../index.css";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

const RootComponent = () => (
  <>
    <HeadContent />
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      // React never runs a script it renders on the client, and warns about it; index.html applies the theme before first paint instead.
      scriptProps={{ type: "application/json" }}
      storageKey="vite-ui-theme"
    >
      <Outlet />
      <Toaster richColors />
    </ThemeProvider>
  </>
);

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  notFoundComponent: () => <NotFound bare />,
  head: ({ matches }) => ({
    meta: [
      {
        // The root has no index route, so a path no route matches leaves it alone.
        title: matches.length === 1 ? "Not found" : "Helios",
      },
      {
        name: "description",
        content: "Track the work of one small team.",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});
