import { useRouter } from "next/router";

import SAMLConfiguration from "@calcom/features/ee/sso/components/SAMLConfiguration";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const SAMLSSO = () => {
  const router = useRouter();

  if (HOSTED_CAL_FEATURES) {
    router.replace("/404");
  }

  return (
    <>
      <Meta title="SAML SSO" description="Allow team members to login using an Identity Provider." />
      <SAMLConfiguration teamsView={false} teamId={null} />
    </>
  );
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
