import { useRouter } from "next/router";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";
import { getSettingsLayout as getLayout, AppSkeletonLoader } from "@calcom/ui";

import SAMLConfiguration from "../components/SAMLConfiguration";

const SAMLSSO = () => {
  const router = useRouter();

  if (!HOSTED_CAL_FEATURES) {
    router.push("/404");
  }

  const teamId = Number(router.query.id);

  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery(
    { teamId },
    {
      onError: () => {
        router.push("/settings");
      },
    }
  );

  if (isLoading) {
    return <AppSkeletonLoader />;
  }

  if (!team) {
    router.push("/404");
    return;
  }

  return <SAMLConfiguration teamId={teamId} />;
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
