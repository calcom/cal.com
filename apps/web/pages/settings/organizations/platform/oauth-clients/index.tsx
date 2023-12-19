import { OAuthClientList } from "@pages/settings/organizations/platform/oauth-clients/components/OAuthClientList";
import { useOAuthClients } from "@pages/settings/organizations/platform/oauth-clients/hooks/useOAuthClients";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import React from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { EmptyScreen } from "@calcom/ui";
import { Meta, Button } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

// Create a client
const queryClient = new QueryClient();

export const OAuthClients = () => {
  const { data, error, isLoading } = useOAuthClients();

  const NewOAuthClientButton = () => {
    const router = useRouter();

    return (
      <Button
        onClick={(e) => {
          e.preventDefault();
          router.push("/settings/organizations/platform/oauth-clients/create");
        }}
        color="secondary"
        StartIcon={Plus}>
        Add
      </Button>
    );
  };

  // TODO: ideally if its loading we can just display a skeleton loader here
  if (isLoading) {
    return <h1>Loading...</h1>;
  }

  // TODO: add better error message to display
  if (error) {
    return <h1>Sorry, an error occured</h1>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <Meta
          title="OAuth clients"
          description="Info about oauth clients"
          CTA={<NewOAuthClientButton />}
          borderInShellHeader={true}
        />
        <div>
          {Array.isArray(data) && data.length ? (
            <>
              <div className="border-subtle rounded-b-lg border border-t-0">
                {data.map((client, index) => {
                  return (
                    <OAuthClientList
                      name={client.name}
                      redirect_uris={client.redirect_uris}
                      permissions={client.permissions}
                      key={index}
                      lastItem={data.length === index + 1}
                      id={client.id}
                      secret={client.secret}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyScreen
              headline="Create your first OAuth client"
              description="OAuth clients faciliate acceess to cal.com on users behalf"
              Icon={Plus}
              className="rounded-b-lg rounded-t-none border-t-0"
              buttonRaw={<NewOAuthClientButton />}
            />
          )}
        </div>
      </div>
    </QueryClientProvider>
  );
};

OAuthClients.getLayout = getLayout;
OAuthClients.PageWrapper = PageWrapper;

export default OAuthClients;
