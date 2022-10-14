import { useRouter } from "next/router";
import React, { useState } from "react";

import SAMLConfiguration from "@calcom/features/ee/sso/components/SAMLConfiguration";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/Alert";
import Meta from "@calcom/ui/v2/core/Meta";
import SkeletonLoader from "@calcom/ui/v2/core/apps/SkeletonLoader";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const SAMLSSO = () => {
  const router = useRouter();

  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (HOSTED_CAL_FEATURES) {
    router.push("/404");
  }

  const teamsView = false;

  const { data: saml, isLoading } = trpc.useQuery(["viewer.saml.access", { teamsView }], {
    onError: (err) => {
      setHasErrors(true);
      setErrorMessage(err.message);
    },
    onSuccess: () => {
      setHasErrors(false);
    },
  });

  if (isLoading) {
    return <SkeletonLoader />;
  }

  return (
    <>
      <Meta title="SAML SSO" description="Allow team members to login using an Identity Provider." />
      {hasErrors && <Alert severity="error" title={errorMessage} />}
      {saml && saml.enabled && <SAMLConfiguration teamsView={teamsView} teamId={null} />}
    </>
  );
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
