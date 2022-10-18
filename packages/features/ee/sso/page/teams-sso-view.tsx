import { useRouter } from "next/router";

import SAMLConfiguration from "@calcom/features/ee/sso/components/SAMLConfiguration";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";
import SkeletonLoader from "@calcom/ui/v2/core/apps/SkeletonLoader";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const SAMLSSO = () => {
  const router = useRouter();

  if (!HOSTED_CAL_FEATURES) {
    router.push("/404");
  }

  const teamId = Number(router.query.id);

  const { data: team, isLoading } = trpc.useQuery(["viewer.teams.get", { teamId }], {
    onError: () => {
      router.push("/settings");
    },
  });

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (!team) {
    router.push("/404");
    return;
  }

  return <SAMLConfiguration teamId={teamId} />;
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
