import { useCheckTeamBilling } from "@lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";
import useMeQuery from "@lib/hooks/useMeQuery";

export const useGetUserAttributes = () => {
  const { data: user, isLoading: isUserLoading } = useMeQuery();
  const { data: userBillingData } = useCheckTeamBilling(user?.organizationId);
  const isPlatformUser = user?.organization.isPlatform;
  const isPaidUser = userBillingData?.valid;

  return { isUserLoading, isPlatformUser, isPaidUser };
};
