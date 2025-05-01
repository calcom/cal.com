import { trpc } from "../trpc";

export function useEmailVerifyCheck() {
  const emailCheck = trpc.viewer.me.shouldVerifyEmail.useQuery(undefined, {
    retry(failureCount) {
      return failureCount > 3;
    },
  });

  return emailCheck;
}

export default useEmailVerifyCheck;
