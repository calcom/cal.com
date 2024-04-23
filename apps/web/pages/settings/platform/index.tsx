import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

import Shell from "@calcom/features/shell/Shell";
import {
  showToast,
  EmptyScreen,
  Button,
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
} from "@calcom/ui";

import {
  useOAuthClients,
  useGetOAuthClientManagedUsers,
} from "@lib/hooks/settings/organizations/platform/oauth-clients/useOAuthClients";
import { useDeleteOAuthClient } from "@lib/hooks/settings/organizations/platform/oauth-clients/usePersistOAuthClient";
import useMeQuery from "@lib/hooks/useMeQuery";

import PageWrapper from "@components/PageWrapper";
import { OAuthClientCard } from "@components/settings/organizations/platform/oauth-clients/OAuthClientCard";

const queryClient = new QueryClient();
// middleware.ts
export default function Platform() {
  const { data, isLoading: isOAuthClientLoading, refetch: refetchClients } = useOAuthClients();
  const [initialClientId, setInitialClientId] = useState("");
  const [initialClientName, setInitialClientName] = useState("");
  const {
    isLoading: isManagedUserLoading,
    data: managedUserData,
    refetch: refetchManagedUsers,
  } = useGetOAuthClientManagedUsers(initialClientId);

  console.log("these are all the managed users of this particular client id");
  console.log(managedUserData?.map((user) => console.log(user)));

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
  const { data: user, isLoading } = useMeQuery();
  const isPlatformUser = user?.organization.isPlatform;

  useEffect(() => {
    setInitialClientId(data[0]?.id);
    setInitialClientName(data[0]?.name);
  }, [data]);

  const NewOAuthClientButton = () => {
    const router = useRouter();

    return (
      <Button
        onClick={(e) => {
          e.preventDefault();
          router.push("/settings/platform/oauth-clients/create");
        }}
        color="secondary"
        StartIcon="plus">
        Add
      </Button>
    );
  };

  if (isLoading || isOAuthClientLoading) return <div className="m-5">Loading...</div>;

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
            <div className="mb-10">
              <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
                <div className="flex w-full flex-col">
                  <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                    OAuth Clients
                  </h1>
                  <p className="text-default text-sm ltr:mr-4 rtl:ml-4">
                    Connect your platform to cal.com with OAuth
                  </p>
                </div>
                <div>
                  <NewOAuthClientButton />
                </div>
              </div>
              {Array.isArray(data) && data.length ? (
                <>
                  <div className="border-subtle rounded-b-lg border border-t-0">
                    {data.map((client, index) => {
                      return (
                        <OAuthClientCard
                          name={client.name}
                          redirectUris={client.redirectUris}
                          bookingRedirectUri={client.bookingRedirectUri}
                          bookingRescheduleRedirectUri={client.bookingRescheduleRedirectUri}
                          bookingCancelRedirectUri={client.bookingCancelRedirectUri}
                          permissions={client.permissions}
                          key={index}
                          lastItem={data.length === index + 1}
                          id={client.id}
                          secret={client.secret}
                          isLoading={isDeleting}
                          onDelete={handleDelete}
                          areEmailsEnabled={client.areEmailsEnabled}
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyScreen
                  headline="Create your first OAuth client"
                  description="OAuth clients facilitate access to Cal.com on behalf of users"
                  Icon="plus"
                  className=""
                  buttonRaw={<NewOAuthClientButton />}
                />
              )}
            </div>
            <div>
              <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
                <div className="flex w-full flex-col">
                  <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                    Managed Users
                  </h1>
                  <p className="text-default text-sm ltr:mr-4 rtl:ml-4">
                    See all the managed users created by your OAuth client.
                  </p>
                </div>
                {Array.isArray(data) && data.length && (
                  <div>
                    <Dropdown modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button color="secondary">{initialClientName}</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {data.map((user) => {
                          return (
                            <div key={user.id}>
                              {initialClientName !== user.name ? (
                                <DropdownMenuItem className="outline-none">
                                  <DropdownItem
                                    type="button"
                                    onClick={() => {
                                      setInitialClientId(user.id);
                                      setInitialClientName(user.name);
                                      refetchManagedUsers();
                                    }}>
                                    {user.name}
                                  </DropdownItem>
                                </DropdownMenuItem>
                              ) : (
                                <></>
                              )}
                            </div>
                          );
                        })}
                      </DropdownMenuContent>
                    </Dropdown>
                  </div>
                )}
              </div>
              {Array.isArray(managedUserData) && !isManagedUserLoading && managedUserData.length ? (
                <>
                  <table className="w-[100%] rounded-lg">
                    <colgroup
                      className="border-subtle overflow-hidden rounded-b-lg border border-b-0"
                      span={3}
                    />
                    <tr>
                      <td className="border-subtle border px-4 py-3 md:text-center">Id</td>
                      <td className="border-subtle border px-4 py-3 md:text-center">Username</td>
                      <td className="border-subtle border px-4 py-3 md:text-center">Email</td>
                    </tr>
                    {managedUserData.map((user) => {
                      return (
                        <tr key={user.id} className="">
                          <td className="border-subtle overflow-hidden border px-4 py-3 md:text-center">
                            {user.id}
                          </td>
                          <td className="border-subtle border px-4 py-3 md:text-center">{user.username}</td>
                          <td className="border-subtle overflow-hidden border px-4 py-3 md:overflow-auto md:text-center">
                            {user.email}
                          </td>
                        </tr>
                      );
                    })}
                  </table>
                </>
              ) : (
                <EmptyScreen
                  limitWidth={false}
                  headline={
                    initialClientId == undefined
                      ? "OAuth client is missing. You need to create an OAuth client first in order to create a managed user."
                      : `OAuth client ${initialClientId} does not have a managed user present.`
                  }
                  description={
                    initialClientId == undefined
                      ? "Refer to the Platform Docs from the sidebar in order to create an OAuth client."
                      : "Refer to the Platform Docs from the sidebar in order to create a managed user."
                  }
                  className="items-center border"
                />
              )}
            </div>
          </Shell>
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <div>
      <Shell hideHeadingOnMobile withoutMain={false} SidebarContainer={<></>}>
        You are not subscribed to a Platform plan.
      </Shell>
    </div>
  );
}

Platform.PageWrapper = PageWrapper;
