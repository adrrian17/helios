import { useSuspenseQuery } from "@tanstack/react-query";

import { orpc } from "./orpc";

/** The signed-in Member; the `_app` route guard has already loaded it. */
export const useMe = () => useSuspenseQuery(orpc.me.queryOptions()).data;
