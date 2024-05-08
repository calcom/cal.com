import { EmptyScreen } from "@calcom/ui";

import type { ManagedUser } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";

type ManagedUserTableProps = {
  managedUsers?: ManagedUser[];
  isManagedUserLoading: boolean;
  initialClientId: string;
};

export const ManagedUserTable = ({
  managedUsers,
  isManagedUserLoading,
  initialClientId,
}: ManagedUserTableProps) => {
  const showUsers = !isManagedUserLoading && managedUsers?.length;

  return (
    <div>
      {showUsers ? (
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
