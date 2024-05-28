import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

import Shell from "@calcom/features/shell/Shell";
import { Card, Icon, showToast } from "@calcom/ui";

import {
  useOAuthClients,
  useGetOAuthClientManagedUsers,
} from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";
import { useDeleteOAuthClient } from "@lib/hooks/settings/platform/oauth-clients/usePersistOAuthClient";

import PageWrapper from "@components/PageWrapper";
import { ManagedUserList } from "@components/settings/platform/dashboard/managed-user-list";
import { OAuthClientsList } from "@components/settings/platform/dashboard/oauth-clients-list";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import { PlatformPricing } from "@components/settings/platform/pricing/platform-pricing";

const queryClient = new QueryClient();

export default function Platform() {
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
      showToast("OAuth client deleted successfully", "success");
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

  if (isPlatformUser && !isPaidUser) return <PlatformPricing teamId={userOrgId} />;

  if (isPlatformUser) {
    return (
      <QueryClientProvider client={queryClient}>
        <div>
          <Shell
            heading="Platform"
            title="Platform"
            hideHeadingOnMobile
            withoutMain={false}
            subtitle="Manage everything related to platform."
            isPlatformUser={true}>
            <>
              <div className="grid-col-1 mb-4 grid gap-2 md:grid-cols-3">
                <div>
                  <Card
                    icon={<Icon name="rocket" className="h-5 w-5 text-green-700" />}
                    variant="basic"
                    title={t("Try our Platform Starter Kit")}
                    description={t(
                      "If you are building a marketplace or platform from scratch, our Platform Starter Kit has everything you need."
                    )}
                    actionButton={{
                      href: `https://experts.cal.com`,
                      child: t("Try the Demo"),
                    }}
                  />
                </div>
                <div>
                  <Card
                    icon={<Icon name="github" className="h-5 w-5 text-orange-700" />}
                    variant="basic"
                    title={t("Get the Source code")}
                    description={t(
                      "Our Platform Starter Kit is being used in production by Cal.com itself. You can find the ready-to-rock source code on GitHub."
                    )}
                    actionButton={{
                      href: `https://github.com/calcom/examples`,
                      child: "GitHub",
                    }}
                  />
                </div>
                <div>
                  <Card
                    icon={<Icon name="calendar-check-2" className="h-5 w-5 text-red-700" />}
                    variant="basic"
                    title="Contact us"
                    description={t(
                      "Book our engineering team for a 15 minute onboarding call and debug a problem. Please come prepared with questions."
                    )}
                    actionButton={{
                      href: `https://i.cal.com/platform`,
                      child: "Schedule a call",
                    }}
                  />
                </div>
              </div>
            </>
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
        You are not subscribed to a Platform plan.
      </Shell>
    </div>
  );
}

Platform.PageWrapper = PageWrapper;
