import React from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";
import { OAuthClientForm } from "@components/settings/organizations/platform/oauth-clients/OAuthClientForm";

export const CreateOAuthClient = () => {
  return (
    <div>
      <OAuthClientForm />
    </div>
  );
};

CreateOAuthClient.getLayout = getLayout;
CreateOAuthClient.PageWrapper = PageWrapper;

export default CreateOAuthClient;
