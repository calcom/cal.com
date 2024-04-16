import { useRouter } from "next/router";
import React from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";
import { OAuthClientForm } from "@components/settings/organizations/platform/oauth-clients/OAuthClientForm";

export const CreateOAuthClient = () => {
  const router = useRouter();
  const clientId = router.query.clientId as string | undefined;
  return (
    <div>
      <OAuthClientForm clientId={clientId} />
    </div>
  );
};

CreateOAuthClient.getLayout = getLayout;
CreateOAuthClient.PageWrapper = PageWrapper;

export default CreateOAuthClient;
