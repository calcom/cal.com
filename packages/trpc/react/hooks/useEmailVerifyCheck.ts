import { trpc } from "../trpc";

export function useEmailVerifyCheck() {
  const emailCheck = trpc.viewer.me.queries.shouldVerifyEmail.useQuery(undefined, {
    retry(failureCount) {
      return failureCount > 3;
    },
  });

  return emailCheck;
}

export default useEmailVerifyCheck;
