// This is a Next.js Page (/settings/platform/oauth-clients)
// first we call two hooks useOauthclients and useoauthperists client
// for the time being we only allow the user to create and delete oauth clients
// updating part can come later
// here we will map over the oAuthClients returned by useOAuthClients and display a OAuthClientCard for each oauth client
import { OAuthClientList } from "@pages/settings/platform/oauth-clients/components/OAuthClientList";
import { useOAuthClients } from "@pages/settings/platform/oauth-clients/hooks/useOAuthClients";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import React from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { EmptyScreen } from "@calcom/ui";
import { Meta, Button } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

// import OAuthCard from "./components/OAuthClientCard.tsx";

// Create a client
const queryClient = new QueryClient();

export const OAuthClients = () => {
  // here get the oAuth clients from useOauthClients
  // const {loading, oAuthClients} = useOAuthClients()
  // get logic to delete clients from usePersistOAuthClient
  // then oAuthClients.map(client => <OAuthCard /> name onDelete onClick(redirect to create oAuthClient page) />)
  // Link button to redirect to create oAuthClient page

  // this custom hook should only be called once the oauth client endpoint is ready
  // until then we mock the data
  const { data: oauthData, error: oauthError, isLoading: oauthIsLoading } = useOAuthClients();

  console.log("IS LOADING", oauthIsLoading);

  console.log("THIS IS THE OAUTH CLIENT DATA THAT I GET FROM NESTJS:", oauthData);

  const isLoading = false;
  const error = "";

  // const data = [];

  // schema for oauth client
  // logo: z.string().optional(),
  // name: z.string(),
  // redirect_uris: z.array(z.string()),
  // permissions: z.number(),

  const data = [
    {
      name: "Cal.com",
      redirect_uris: ["https://discord.com/developers/docs/topics/permissions"],
      permissions: 10,
    },
    {
      name: "Acme.com",
      redirect_uris: [
        "https://discord.com/developers/docs/topics/permissions",
        "https://app.cal.com/settings/developer/api-keys",
      ],
      permissions: 3,
    },
  ];

  const NewOAuthClientButton = () => {
    const router = useRouter();

    return (
      <Button
        onClick={(e) => {
          e.preventDefault();
          router.push("/settings/platform/oauth-clients/create");
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
          {data?.length ? (
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
                    />
                  );
                })}
                {/* <OAuthClientList
                  name="Cal.com"
                  redirect_uris={[
                    "http://localhost:3000/settings/platform/oauth-clients",
                    "http://localhost:3000/settings/platform/oauth-clients",
                  ]}
                  permissions="111001"
                /> */}
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

// className="border-subtle flex flex-col rounded-b-lg border border-t-0 p-6" dumb component classname
