import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { NotFound, RouteError } from "./components/route-states";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./utils/orpc";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: () => <NotFound />,
  context: { orpc, queryClient },
  Wrap: function Wrap({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  },
});

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** A page that lists Issues, where phones float the New Issue button. */
    issueList?: boolean;
  }

  interface Register {
    router: typeof router;
  }
}

const rootElement = document.querySelector("#app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.hasChildNodes()) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}
