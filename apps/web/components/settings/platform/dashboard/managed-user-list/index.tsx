import type { PlatformOAuthClient } from "@calcom/prisma/client";
import { EmptyScreen } from "@calcom/ui";

import type { ManagedUser } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";

import { OAuthClientsDropdown } from "@components/settings/platform/dashboard/oauth-client-dropdown";

type ManagedUserListProps = {
  oauthClients: PlatformOAuthClient[];
  managedUsers?: ManagedUser[];
  initialClientName: string;
  initialClientId: string;
  isManagedUserLoading: boolean;
  handleChange: (clientId: string, clientName: string) => void;
};

export const ManagedUserList = ({
  initialClientName,
  initialClientId,
  oauthClients,
  managedUsers,
  isManagedUserLoading,
  handleChange,
}: ManagedUserListProps) => {
  return (
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
        {Array.isArray(oauthClients) && oauthClients.length > 0 && (
          <OAuthClientsDropdown
            oauthClients={oauthClients}
            initialClientName={initialClientName}
            handleChange={handleChange}
          />
        )}
      </div>
      {Array.isArray(managedUsers) && !isManagedUserLoading && managedUsers.length ? (
        <>
          <table className="w-[100%] rounded-lg">
            <colgroup className="border-subtle overflow-hidden rounded-b-lg border border-b-0" span={3} />
            <tr>
              <td className="border-subtle border px-4 py-3 md:text-center">Id</td>
              <td className="border-subtle border px-4 py-3 md:text-center">Username</td>
              <td className="border-subtle border px-4 py-3 md:text-center">Email</td>
            </tr>
            {managedUsers.map((user) => {
              return (
                <tr key={user.id} className="">
                  <td className="border-subtle overflow-hidden border px-4 py-3 md:text-center">{user.id}</td>
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
  );
};
