"use client";

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui";

import {
  useOAuthClients,
  useGetOAuthClientManagedUsers,
} from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";
import { useDeleteOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";

import { HelpCards } from "@components/settings/platform/dashboard/HelpCards";
import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { ManagedUserList } from "@components/settings/platform/dashboard/managed-user-list";
import { OAuthClientsList } from "@components/settings/platform/dashboard/oauth-clients-list";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import { PlatformPricing } from "@components/settings/platform/pricing/platform-pricing";

const queryClient = new QueryClient();

export default function Platform() {
  const { t } = useLocale();
  const [initialClientId, setInitialClientId] = useState("");
  const [initialClientName, setInitialClientName] = useState("");

  const { data, isLoading: isOAuthClientLoading, refetch: refetchClients } = useOAuthClients();
  const {
    isLoading: isManagedUserLoading,
    data: managedUserData,
    refetch: refetchManagedUsers,
  } = useGetOAuthClientManagedUsers(initialClientId);

  const { isUserLoading, isUserBillingDataLoading, isPlatformUser, isPaidUser, userBillingData, userOrgId } =
    useGetUserAttributes();

  const { mutateAsync, isPending: isDeleting } = useDeleteOAuthClient({
    onSuccess: () => {
      showToast(t("oauth_client_deletion_message"), "success");
      refetchClients();
      refetchManagedUsers();
    },
  });

  const handleDelete = async (id: string) => {
    await mutateAsync({ id: id });
  };

  useEffect(() => {
    setInitialClientId(data[0]?.id);
    setInitialClientName(data[0]?.name);
  }, [data]);

  if (isUserLoading || isOAuthClientLoading) return <div className="m-5">Loading...</div>;

  if (isUserBillingDataLoading && !userBillingData) {
    return <div className="m-5">Loading...</div>;
  }

  if (isPlatformUser && !isPaidUser)
    return (
      <PlatformPricing
        teamId={userOrgId}
        heading={
          <div className="mb-5 text-center text-2xl font-semibold">
            <h1>Subscribe to Platform</h1>
          </div>
        }
      />
    );

  if (isPlatformUser) {
    return (
      <QueryClientProvider client={queryClient}>
        <div>
          <Shell
            heading={t("platform")}
            subtitle={t("platform_description")}
            title={t("platform")}
            description={t("platform_description")}
            hideHeadingOnMobile
            withoutMain={false}
            isPlatformUser={true}>
            <HelpCards />
            <OAuthClientsList oauthClients={data} isDeleting={isDeleting} handleDelete={handleDelete} />
            <ManagedUserList
              oauthClients={data}
              managedUsers={managedUserData}
              isManagedUserLoading={isManagedUserLoading}
              initialClientName={initialClientName}
              initialClientId={initialClientId}
              handleChange={(id: string, name: string) => {
                setInitialClientId(id);
                setInitialClientName(name);
                refetchManagedUsers();
              }}
            />
          </Shell>
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <div>
      <Shell
        // we want to hide org banner and have different sidebar tabs for platform clients
        // hence we pass isPlatformUser boolean as prop
        isPlatformUser={true}
        hideHeadingOnMobile
        withoutMain={false}
        SidebarContainer={<></>}>
        <NoPlatformPlan />
      </Shell>
    </div>
  );
}
