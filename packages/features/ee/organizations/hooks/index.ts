import { trpc } from "@calcom/trpc/react";

export function useOrgBrandingValues() {
  return trpc.viewer.organizations.getBrand.useQuery().data;
}
