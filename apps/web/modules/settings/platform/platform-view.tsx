"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { HelpCards } from "@components/settings/platform/dashboard/HelpCards";
import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { OAuthClientsList } from "@components/settings/platform/dashboard/oauth-clients-list";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import { PlatformPricing } from "@components/settings/platform/pricing/platform-pricing";
import { useExternalRedirectHandler } from "@lib/hooks/settings/platform/billing/useExternalRedirectHandler";
import { useDeleteOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/useDeleteOAuthClient";
import { useOAuthClients } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Shell from "~/shell/Shell";

const queryClient = new QueryClient();

const PlatformSkeletonLoader = () => (
  <Shell
    isPlatformUser={true}
    withoutMain={false}
    SidebarContainer={<></>}
    heading={<SkeletonText className="h-6 w-36" />}
    subtitle={<SkeletonText className="mt-1 h-4 w-64" />}
    title={undefined}
    description={undefined}>
    <div className="mb-10">
      <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
        <div className="flex w-full flex-col gap-1">
          <SkeletonText className="h-5 w-40" />
          <SkeletonText className="h-4 w-56" />
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="bg-emphasis h-9 w-20 animate-pulse rounded-md" />
        </div>
      </div>
      <div className="border-subtle divide-subtle divide-y rounded-b-lg border border-t-0">
        {[0, 1].map((i) => (
          <div key={i} className="flex w-full justify-between px-4 py-4 sm:px-6">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex gap-2">
                <SkeletonText className="h-4 w-28" />
                <SkeletonText className="h-4 w-48" />
              </div>
              <div className="flex gap-2">
                <SkeletonText className="h-4 w-24" />
                <SkeletonText className="h-4 w-40" />
              </div>
              <div className="flex gap-2">
                <SkeletonText className="h-4 w-28" />
                <SkeletonText className="h-4 w-28" />
                <SkeletonText className="h-4 w-20" />
              </div>
            </div>
            <div className="ml-4 flex shrink-0 items-start gap-3">
              <div className="bg-emphasis h-8 w-20 animate-pulse rounded-md" />
              <div className="bg-emphasis h-8 w-16 animate-pulse rounded-md" />
              <div className="bg-emphasis h-8 w-16 animate-pulse rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </Shell>
);

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

  if (isUserLoading || isOAuthClientLoading) return <PlatformSkeletonLoader />;

  if (isUserBillingDataLoading && !userBillingData) {
    return <PlatformSkeletonLoader />;
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
