import { trpc } from "../trpc";

/**
 * Focused hook for fetching only premium status data.
 * Returns: isPremium boolean
 * Use this instead of useMeQuery when you only need to check premium status.
 */
export function useMePremium() {
  return trpc.viewer.me.premium.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - premium status doesn't change frequently
    retry(failureCount) {
      return failureCount < 3;
    },
  });
}

export default useMePremium;
