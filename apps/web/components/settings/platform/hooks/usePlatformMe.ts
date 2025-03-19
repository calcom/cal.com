import { trpc } from "@calcom/trpc/react";

export function usePlatformMe() {
  const meQuery = trpc.viewer.me.platformMe.useQuery(undefined, {
    retry(failureCount) {
      return failureCount > 3;
    },
    // 5 minutes
    staleTime: 300000,
  });

  return meQuery;
}

export default usePlatformMe;
