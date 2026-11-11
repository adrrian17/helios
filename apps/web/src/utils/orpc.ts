import type { AppRouterClient } from "@helios/api/routers/index";
import { ORPCError, createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ENV } from "../env.public";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** The form shows the error itself, so no toast. */
      inlineError?: boolean;
      /** The caller refreshes data itself, as when a delete leaves the page showing what it deleted. */
      skipRefetch?: boolean;
    };
  }
}

const MAX_RETRIES = 2;
const CLIENT_ERROR = { min: 400, max: 499 };

/** A 4xx (signed out, forbidden, not found, invalid) won't fix itself, so show it at once. */
const isClientError = (error: Error) =>
  error instanceof ORPCError &&
  error.status >= CLIENT_ERROR.min &&
  error.status <= CLIENT_ERROR.max;

/** What to show for a failed request; fetch's own "Failed to fetch" means nothing to a Member. */
export const describeError = (error: Error) =>
  // fetch rejects with a TypeError when the server cannot be reached at all.
  error instanceof TypeError
    ? "Helios can’t reach its server. Check your connection, then try again."
    : error.message;

const createQueryClient = (): QueryClient => {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failures, error) =>
          !isClientError(error) && failures < MAX_RETRIES,
      },
    },
    // No realtime: every successful write refetches what is on screen.
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.inlineError !== true) {
          toast.error(describeError(error));
        }
      },
      onSuccess: async (_data, _variables, _context, mutation) => {
        if (mutation.meta?.skipRefetch !== true) {
          await client.invalidateQueries();
        }
      },
    }),
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Route guards handle a missing session; route error screens handle a first load.
        if (
          (error instanceof ORPCError && error.code === "UNAUTHORIZED") ||
          query.state.data === undefined
        ) {
          return;
        }

        toast.error(describeError(error), {
          action: {
            label: "Retry",
            onClick: () => {
              query.invalidate();
            },
          },
        });
      },
    }),
  });

  return client;
};

export const queryClient = createQueryClient();

const link = new RPCLink({
  url: `${ENV.VITE_SERVER_URL.replace(/\/$/u, "")}/rpc`,
  fetch: async (url, options) =>
    await fetch(url, {
      ...options,
      credentials: "include",
    }),
});

const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
