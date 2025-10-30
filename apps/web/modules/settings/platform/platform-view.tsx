"use client";

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui/components/toast";

import { useExternalRedirectHandler } from "@lib/hooks/settings/platform/billing/useExternalRedirectHandler";
import { useDeleteOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/useDeleteOAuthClient";
import { useOAuthClients } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";

import { HelpCards } from "@components/settings/platform/dashboard/HelpCards";
import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { OAuthClientsList } from "@components/settings/platform/dashboard/oauth-clients-list";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import { PlatformPricing } from "@components/settings/platform/pricing/platform-pricing";

const queryClient = new QueryClient();

export default function Platform() {
  const { t } = useLocale();
  const [_initialClientId, setInitialClientId] = useState("");
  const [_initialClientName, setInitialClientName] = useState("");
  const pathname = usePathname();

  const { data, isLoading: isOAuthClientLoading, refetch: refetchClients } = useOAuthClients();

  const {
    isUserLoading,
    isUserBillingDataLoading,
    isPlatformUser,
    isPaidUser,
    userBillingData,
    userOrgId,
    refetchTeamBilling,
    refetchPlatformUser,
  } = useGetUserAttributes();

  const { mutateAsync, isPending: isDeleting } = useDeleteOAuthClient({
    onSuccess: () => {
      showToast(t("oauth_client_deletion_message"), "success");
      refetchClients();
    },
  });

  const handleDelete = async (id: string) => {
    await mutateAsync({ id: id });
  };

  const refetchBillingState = useCallback(() => {
    refetchTeamBilling();
    refetchPlatformUser();
  }, [refetchTeamBilling, refetchPlatformUser]);

  useEffect(() => {
    setInitialClientId(data[0]?.id);
    setInitialClientName(data[0]?.name);
  }, [data]);

  useEffect(() => {
    refetchBillingState();
  }, [pathname, refetchTeamBilling, refetchPlatformUser, refetchBillingState]);

  useExternalRedirectHandler(() => {
    refetchBillingState();
  });

  if (isUserLoading || isOAuthClientLoading) return <div className="m-5">{t("loading")}</div>;

  if (isUserBillingDataLoading && !userBillingData) {
    return <div className="m-5">{t("loading")}</div>;
  }

  if (isPlatformUser && !isPaidUser)
    return (
      <PlatformPricing
        teamId={userOrgId}
        heading={
          <div className="mb-5 text-center text-2xl font-semibold">
            <h1>{t("subscribe_to_platform")}</h1>
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
            withoutMain={false}
            isPlatformUser={true}>
            <HelpCards />
            <OAuthClientsList oauthClients={data} isDeleting={isDeleting} handleDelete={handleDelete} />
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
        withoutMain={false}
        SidebarContainer={<></>}>
        <NoPlatformPlan />
      </Shell>
    </div>
  );
}
