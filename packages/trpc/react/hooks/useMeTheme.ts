import { trpc } from "../trpc";

/**
 * Focused hook for fetching only theme-related user data.
 * Returns: brandColor, darkBrandColor, appTheme
 * Use this instead of useMeQuery when you only need theme data.
 */
export function useMeTheme() {
  return trpc.viewer.me.theme.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - theme data doesn't change frequently
    retry(failureCount) {
      return failureCount < 3;
    },
  });
}

export default useMeTheme;
