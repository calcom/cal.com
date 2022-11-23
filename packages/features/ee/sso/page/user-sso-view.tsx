import { useRouter } from "next/router";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { getSettingsLayout as getLayout } from "@calcom/ui";

import SAMLConfiguration from "../components/SAMLConfiguration";

const SAMLSSO = () => {
  const router = useRouter();

  if (HOSTED_CAL_FEATURES) {
    router.push("/404");
  }

  const teamId = null;

  return <SAMLConfiguration teamId={teamId} />;
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
