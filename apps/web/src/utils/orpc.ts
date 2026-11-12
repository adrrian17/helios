import type { AppRouterClient } from "@helios/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ENV } from "../env.public";

const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        toast.error(`Error: ${error.message}`, {
          action: {
            label: "retry",
            onClick: () => {
              query.invalidate();
            },
          },
        });
      },
    }),
  });

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
