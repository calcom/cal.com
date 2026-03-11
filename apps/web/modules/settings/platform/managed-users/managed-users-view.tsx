"use client";

import { useMemo, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Skeleton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { PlatformManagedUsersTable } from "@calcom/web/modules/users/components/UserTable/PlatformManagedUsersTable";

import { useOAuthClients } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";

import Shell from "~/shell/Shell";

type OAuthClientOption = { label: string; value: string };

const ManagedUsersView = () => {
  const { t } = useLocale();
  const { data: OAuthClientsQueryData, error, isLoading: isOAuthClientLoading } = useOAuthClients();

  const oAuthClientOptions: OAuthClientOption[] = useMemo(
    () =>
      OAuthClientsQueryData.map((client) => ({
        label: client.name,
        value: client.id,
      })),
    [OAuthClientsQueryData]
  );

  const [oAuthClient, setOAuthClient] = useState<OAuthClientOption | null>(oAuthClientOptions[0] || null);

  const ManagedUsersSkeletonLoader = () => {
    return (
      <div className="flex">
        <div className="w-1/4 p-4" />
        <div className="flex-1 p-6">
          <SkeletonContainer>
            <div className="mb-4 flex justify-between">
              <SkeletonText className="mb-2 h-6 w-1/3" />
              <SkeletonText className="h-6 w-1/5" />
            </div>
            <div className="mb-4">
              <SkeletonText className="h-8 w-1/2 rounded-md" />
            </div>
            <div className="border-subtle flex items-center border-b py-3">
              <SkeletonText className="h-6 w-1/4" />
              <SkeletonText className="ml-4 h-6 w-1/5" />
              <SkeletonText className="ml-4 h-6 w-1/5" />
            </div>

            <div className="mt-4">
              <SkeletonText className="mx-auto h-4 w-1/3" />
            </div>
          </SkeletonContainer>
        </div>
      </div>
    );
  };

  if (isOAuthClientLoading) {
    return <ManagedUsersSkeletonLoader />;
  }

  if (error) {
    return <div className="m-5 text-red-500">{t("Failed to load OAuth clients.")}</div>;
  }

  if (!OAuthClientsQueryData.length) {
    return (
      <div className="m-5">{t("No OAuth clients available. Please create one to view managed users.")}</div>
    );
  }

  return (
    <Shell
      heading={t("managed_users")}
      subtitle={t("managed_users_description")}
      title={t("managed_users")}
      description={t("managed_users_description")}
      withoutMain={false}
      isPlatformUser={true}>
      <Skeleton as={Label} loadingClassName="w-16" title={t("select_oAuth_client")}>
        {t("select_oAuth_client")}
      </Skeleton>
      <Select
        className="z-20 mb-4 w-40"
        options={oAuthClientOptions}
        value={oAuthClient}
        isSearchable={false}
        onChange={(client) => client && setOAuthClient(client)}
      />
      {oAuthClient && <PlatformManagedUsersTable oAuthClientId={oAuthClient.value} />}
    </Shell>
  );
};

export default ManagedUsersView;
