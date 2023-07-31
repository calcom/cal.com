import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { CAL_URL, WEBAPP_URL } from "@calcom/lib/constants";

export const useBookerUrl = () => {
  const orgBranding = useOrgBranding();
  return orgBranding?.fullDomain ?? CAL_URL ?? WEBAPP_URL;
};
