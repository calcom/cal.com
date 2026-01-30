import { trpc } from "../trpc";

/**
 * Focused hook for fetching only user profiles data.
 * Returns: profiles array
 * Use this instead of useMeQuery when you only need profiles for profile switching.
 */
export function useMeProfiles() {
  return trpc.viewer.me.profiles.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - profiles data doesn't change frequently
    retry(failureCount) {
      return failureCount < 3;
    },
  });
}

export default useMeProfiles;
