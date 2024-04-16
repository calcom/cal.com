import React from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";

import PageWrapper from "@components/PageWrapper";
import { OAuthClientForm } from "@components/settings/organizations/platform/oauth-clients/OAuthClientForm";

export const CreateOAuthClient = () => {
  const routerQuery = useRouterQuery();
  const { clientId } = routerQuery;
  return (
    <div>
      <OAuthClientForm clientId={clientId as string | undefined} />
    </div>
  );
};

CreateOAuthClient.getLayout = getLayout;
CreateOAuthClient.PageWrapper = PageWrapper;

export default CreateOAuthClient;
