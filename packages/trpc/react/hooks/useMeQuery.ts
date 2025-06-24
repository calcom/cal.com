import { trpc } from "../trpc";

export function useMeQuery() {
  const meQuery = trpc.viewer.me.get.useQuery(undefined, {
    retry(failureCount) {
      return failureCount > 3;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - prevent refetching during navigation
    refetchOnWindowFocus: false, // Prevent refetch on window focus during navigation
  });

  return meQuery;
}

export default useMeQuery;
