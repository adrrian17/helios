import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

const useIssueOptions = () => {
  const { identifier } = useParams({ from: "/_app/issue/$identifier" });

  return orpc.issues.get.queryOptions({ input: { identifier } });
};

/** The Issue the route is showing; its loader has already fetched it. */
export const useIssue = () => useSuspenseQuery(useIssueOptions()).data;
