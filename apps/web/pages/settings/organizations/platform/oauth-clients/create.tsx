import { OAuthClientForm } from "@pages/settings/organizations/platform/oauth-clients/components/OAuthClientForm";
import React from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

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
