import { trpc } from "../trpc";

/**
 * Focused hook for fetching only avatar-related user data.
 * Returns: avatar, avatarUrl, name, username
 * Use this instead of useMeQuery when you only need avatar/identity data.
 */
export function useMeAvatar() {
  return trpc.viewer.me.avatar.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - avatar data doesn't change frequently
    retry(failureCount) {
      return failureCount < 3;
    },
  });
}

export default useMeAvatar;
