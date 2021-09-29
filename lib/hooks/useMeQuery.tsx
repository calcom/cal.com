import { useSession } from "next-auth/client";
import { useEffect } from "react";

import { trpc } from "@lib/trpc";

export function useMeQuery() {
  const [session] = useSession();
  const meQuery = trpc.useQuery(["viewer.me"], {
    // refetch max once per 5s
    staleTime: 5000,
  });

  useEffect(() => {
    // refetch if sesion changes
    meQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return meQuery;
}
