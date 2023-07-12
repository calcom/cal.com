import { useSession } from "next-auth/react";

import { trpc } from "@calcom/trpc/react";

export function useOrgBrandingValues() {
  const session = useSession();
  return trpc.viewer.organizations.getBrand.useQuery(undefined, {
    // Only fetch if we have a session to avoid flooding logs with errors
    enabled: session.status === "authenticated",
    // Refetch the query only when org slug or logo changes which would be not frequent
    staleTime: Infinity,
  }).data;
}
