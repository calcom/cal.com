import { useCheckTeamBilling } from "@lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";
import useMeQuery from "@lib/hooks/useMeQuery";

export const useGetUserAttributes = () => {
  const { data: user, isLoading: isUserLoading } = useMeQuery();
  const { data: userBillingData, isFetching: isUserBillingDataLoading } = useCheckTeamBilling(
    user?.organizationId
  );
  const isPlatformUser = user?.organization.isPlatform;
  const isPaidUser = userBillingData?.valid;
  const userOrgId = user?.organizationId;

  return { isUserLoading, isUserBillingDataLoading, isPlatformUser, isPaidUser, userBillingData, userOrgId };
};
