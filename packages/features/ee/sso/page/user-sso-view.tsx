import { useRouter } from "next/router";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
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
