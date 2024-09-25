import type { PlatformOAuthClient } from "@calcom/prisma/client";

import type { ManagedUser } from "@lib/hooks/settings/platform/oauth-clients/useOAuthClients";

import { ManagedUserHeader } from "@components/settings/platform/dashboard/managed-user-header";
import { ManagedUserTable } from "@components/settings/platform/dashboard/managed-user-table";

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
      <ManagedUserHeader
        oauthClients={oauthClients}
        initialClientName={initialClientName}
        handleChange={handleChange}
      />
      <ManagedUserTable
        managedUsers={managedUsers}
        isManagedUserLoading={isManagedUserLoading}
        initialClientId={initialClientId}
      />
    </div>
  );
};
