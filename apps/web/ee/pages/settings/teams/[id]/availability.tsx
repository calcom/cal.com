import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/Alert";
import LicenseRequired from "@ee/components/LicenseRequired";
import TeamAvailabilityScreen from "@ee/components/team/availability/TeamAvailabilityScreen";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import useMeQuery from "@lib/hooks/useMeQuery";

import Loader from "@components/Loader";
import Shell from "@components/Shell";
import Avatar from "@components/ui/Avatar";

export function TeamAvailabilityPage() {
  const { t } = useLocale();
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState("");

  const me = useMeQuery();
  const isFreeUser = me.data?.plan === "FREE";

  const { data: team, isLoading } = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    refetchOnWindowFocus: false,
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  // prevent unnecessary re-renders due to shell queries
  const TeamAvailability = useMemo(() => {
    return <TeamAvailabilityScreen team={team} />;
  }, [team]);

  return (
    <Shell
      backPath={!errorMessage ? `/settings/teams/${team?.id}` : undefined}
      heading={!isFreeUser && team?.name}
      flexChildrenContainer
      subtitle={team && !isFreeUser && "Your team's availability at a glance"}
      HeadingLeftIcon={
        team &&
        !isFreeUser && (
          <Avatar
            size={12}
            imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
            alt="Team Logo"
            className="mt-1"
          />
        )
      }>
      <LicenseRequired>
        {!!errorMessage && <Alert className="-mt-24 border" severity="error" title={errorMessage} />}
        {isLoading && <Loader />}
        {isFreeUser ? (
          <Alert className="-mt-24 border" severity="warning" title={t("pro_feature_teams")} />
        ) : (
          TeamAvailability
        )}
      </LicenseRequired>
    </Shell>
  );
}

export default TeamAvailabilityPage;
