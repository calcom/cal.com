import { useRouter } from "next/router";

import SAMLConfiguration from "@calcom/features/ee/sso/components/SAMLConfiguration";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";
import Meta from "@calcom/ui/v2/core/Meta";
import SkeletonLoader from "@calcom/ui/v2/core/apps/SkeletonLoader";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const SAMLSSO = () => {
  const router = useRouter();

  if (HOSTED_CAL_FEATURES) {
    router.replace("/404");
  }

  const teamsView = false;

  const { data: saml, isLoading } = trpc.useQuery(["viewer.saml.access", { teamsView }], {
    onError: () => {
      router.push("/settings");
    },
  });

  if (isLoading) {
    return <SkeletonLoader />;
  }

  return (
    <>
      <Meta title="SAML SSO" description="Allow team members to login using an Identity Provider." />
      {saml && saml.enabled ? <SAMLConfiguration teamsView={teamsView} teamId={null} /> : null}
    </>
  );
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
