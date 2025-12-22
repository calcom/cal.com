import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";

export const getBookerBaseUrlSync = (
  orgSlug: string | null,
  options?: {
    protocol: boolean;
  }
) => {
  return getOrgFullOrigin(orgSlug ?? "", options);
};
