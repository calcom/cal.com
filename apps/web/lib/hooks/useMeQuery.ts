import { trpc } from "@calcom/trpc/react";

export function useMeQuery() {
  const meQuery = trpc.viewer.me.useQuery(undefined, {
    retry(failureCount) {
      return failureCount > 3;
    },
  });

  return meQuery;
}

export default useMeQuery;
