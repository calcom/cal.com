import type { PlatformOAuthClient } from "@calcom/prisma/client";

import { OAuthClientsDropdown } from "@components/settings/platform/dashboard/oauth-client-dropdown";

type ManagedUserHeaderProps = {
  oauthClients: PlatformOAuthClient[];
  initialClientName: string;
  handleChange: (clientId: string, clientName: string) => void;
};

export const ManagedUserHeader = ({
  oauthClients,
  initialClientName,
  handleChange,
}: ManagedUserHeaderProps) => {
  return (
    <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
      <div className="flex w-full flex-col">
        <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
          Managed Users
        </h1>
        <p className="text-default text-sm ltr:mr-4 rtl:ml-4">
          See all the managed users created by your OAuth client.
        </p>
      </div>
      <OAuthClientsDropdown
        oauthClients={oauthClients}
        initialClientName={initialClientName}
        handleChange={handleChange}
      />
    </div>
  );
};
