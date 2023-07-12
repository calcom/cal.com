import { useOrgBrandingValues } from "@calcom/features/ee/organizations/hooks";
import { WEBAPP_URL } from "@calcom/lib/constants";

export const useBookerUrl = () => {
  const orgBranding = useOrgBrandingValues();
  return orgBranding?.fullDomain ?? WEBAPP_URL;
};
