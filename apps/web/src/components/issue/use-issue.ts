import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";

import type { IssueDetail } from "@/utils/domain";
import { orpc } from "@/utils/orpc";

export const useIssueOptions = () => {
  const { identifier } = useParams({ from: "/_app/issue/$identifier" });

  return orpc.issues.get.queryOptions({ input: { identifier } });
};

/** The Issue the route is showing; its loader has already fetched it. */
export const useIssue = () => useSuspenseQuery(useIssueOptions()).data;

/**
 * Edits the cached Issue ahead of the server, for writes that should feel
 * instant (Checklist ticks and reorders). The mutation cache refetches
 * everything once the write lands; `revert` reloads it after a failure.
 */
export const useIssueCache = () => {
  const queryClient = useQueryClient();
  const { queryKey } = useIssueOptions();

  return {
    patch: (change: (issue: IssueDetail) => IssueDetail) => {
      void queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<IssueDetail>(queryKey, (issue) =>
        issue === undefined ? issue : change(issue)
      );
    },
    revert: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  };
};
