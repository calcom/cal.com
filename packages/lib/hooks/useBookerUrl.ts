import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";

export const useBookerUrl = (options?: { excludeWebsiteUrl?: boolean }) => {
  const orgBranding = useOrgBranding();

  if (options.excludeWebsiteUrl) {
    return orgBranding?.fullDomain ?? WEBAPP_URL;
  }

  return orgBranding?.fullDomain ?? WEBSITE_URL ?? WEBAPP_URL;
};
