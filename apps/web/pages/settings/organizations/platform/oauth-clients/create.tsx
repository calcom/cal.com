import React from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

import PageWrapper from "@components/PageWrapper";
import { OAuthClientForm } from "@components/settings/organizations/platform/oauth-clients/OAuthClientForm";

export const CreateOAuthClient = () => {
  const searchParams = useCompatSearchParams();
  const clientId = searchParams?.get("clientId") || "";
  return (
    <div>
      <OAuthClientForm clientId={clientId} />
    </div>
  );
};

CreateOAuthClient.getLayout = getLayout;
CreateOAuthClient.PageWrapper = PageWrapper;

export default CreateOAuthClient;
