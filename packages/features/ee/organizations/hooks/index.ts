import { useSession } from "next-auth/react";

import { trpc } from "@calcom/trpc/react";

export function useOrgBrandingValues() {
  const { data: session } = useSession();
  return trpc.viewer.organizations.getBrand.useQuery({ orgId: session?.user.organizationId }).data;
}
