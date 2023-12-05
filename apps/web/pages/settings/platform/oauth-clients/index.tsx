// This is a Next.js Page (/settings/platform/oauth-clients)
// first we call two hooks useOauthclients and useoauthperists client
// for the time being we only allow the user to create and delete oauth clients
// updating part can come later
// here we will map over the oAuthClients returned by useOAuthClients and display a OAuthClientCard for each oauth client
import React from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import OAuthCard from "./components/OAuthClientCard.tsx";

export const OAuthClients = () => {
  // here get the oAuth clients from useOauthClients
  // const {loading, oAuthClients} = useOAuthClients()
  // get logic to delete clients from usePersistOAuthClient
  // then oAuthClients.map(client => <OAuthCard /> name onDelete onClick(redirect to create oAuthClient page) />)
  // Link button to redirect to create oAuthClient page
  return (
    <div className="mt-4">
      <OAuthCard />
    </div>
  );
};

OAuthClients.getLayout = getLayout;
OAuthClients.PageWrapper = PageWrapper;

export default OAuthClients;
