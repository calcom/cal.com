import { useRouter } from "next/router";

import SAMLConfiguration from "@calcom/features/ee/sso/components/SAMLConfiguration";
import { trpc } from "@calcom/trpc/react";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const SAMLSSO = () => {
  const router = useRouter();

  const { data: team } = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    onError: () => {
      router.push("/settings");
    },
  });

  if (!team) {
    return null;
  }

  return <SAMLConfiguration teamsView={true} teamId={team.id} />;
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
