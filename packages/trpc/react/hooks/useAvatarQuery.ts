import { trpc } from "../trpc";

export function useAvatarQuery() {
  const avatarQuery = trpc.viewer.avatar.useQuery(undefined, {
    retry(failureCount) {
      return failureCount > 3;
    },
  });

  return avatarQuery;
}

export default useAvatarQuery;
