import { useCheckTeamBilling } from "@calcom/web/lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";

import { usePlatformMe } from "./usePlatformMe";

export const useGetUserAttributes = () => {
  const { data: platformUser, isLoading: isPlatformUserLoading } = usePlatformMe();
  const { data: userBillingData, isFetching: isUserBillingDataLoading } = useCheckTeamBilling(
    platformUser?.organizationId,
    platformUser?.organization?.isPlatform ?? false
  );
  const isPlatformUser = platformUser?.organization?.isPlatform ?? false;
  const isPaidUser = userBillingData?.valid;
  const userOrgId = platformUser?.organizationId;

  return {
    isUserLoading: isPlatformUserLoading,
    isUserBillingDataLoading,
    isPlatformUser,
    isPaidUser,
    userBillingData,
    userOrgId,
  };
};
