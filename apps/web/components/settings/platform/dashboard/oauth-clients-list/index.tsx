import type { PlatformOAuthClientDto } from "@calcom/platform-types";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { OAuthClientCard } from "@components/settings/platform/oauth-clients/OAuthClientCard";
import { useRouter } from "next/navigation";

type OAuthClientsListProps = {
  oauthClients: PlatformOAuthClientDto[];
  isDeleting: boolean;
  handleDelete: (id: string) => Promise<void>;
};

export const OAuthClientsList = ({ oauthClients, isDeleting, handleDelete }: OAuthClientsListProps) => {
  return (
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
          <NewOAuthClientButton redirectLink="/settings/platform/oauth-clients/create" />
        </div>
      </div>
      {Array.isArray(oauthClients) && oauthClients.length ? (
        <>
          <div className="border-subtle rounded-b-lg border border-t-0">
            {oauthClients.map((client, index) => {
              return (
                <OAuthClientCard
                  name={client.name}
                  redirectUris={client.redirectUris}
                  bookingRedirectUri={client.bookingRedirectUri}
                  bookingRescheduleRedirectUri={client.bookingRescheduleRedirectUri}
                  bookingCancelRedirectUri={client.bookingCancelRedirectUri}
                  permissions={client.permissions}
                  key={index}
                  lastItem={oauthClients.length === index + 1}
                  id={client.id}
                  secret={client.secret}
                  isLoading={isDeleting}
                  onDelete={handleDelete}
                  areEmailsEnabled={client.areEmailsEnabled}
                  areDefaultEventTypesEnabled={client.areDefaultEventTypesEnabled}
                  areCalendarEventsEnabled={client.areCalendarEventsEnabled}
                  organizationId={client.organizationId}
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
          buttonRaw={<NewOAuthClientButton redirectLink="/settings/platform/oauth-clients/create" />}
        />
      )}
    </div>
  );
};

const NewOAuthClientButton = ({ redirectLink, label }: { redirectLink: string; label?: string }) => {
  const router = useRouter();

  return (
    <Button
      onClick={(e) => {
        e.preventDefault();
        router.push(redirectLink);
      }}
      color="secondary"
      StartIcon="plus">
      {label ? label : "Add"}
    </Button>
  );
};
