import { trpc } from "../trpc";

export function useSessionQuery() {
  const sessionQuery = trpc.viewer.public.session.useQuery(undefined, {
    retry(failureCount) {
      return failureCount > 3;
    },
  });

  return sessionQuery;
}

export default useSessionQuery;
