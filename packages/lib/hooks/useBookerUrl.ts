import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBAPP_URL } from "@calcom/lib/constants";

export const useBookerUrl = () => {
  const orgBranding = useOrgBranding();
  return orgBranding?.fullDomain ?? WEBAPP_URL;
};
