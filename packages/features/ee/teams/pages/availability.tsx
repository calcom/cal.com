import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import { getPlaceholderAvatar } from "@calcom/lib/getPlaceholderAvatar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Alert, Avatar, Loader, Shell } from "@calcom/ui";

import LicenseRequired from "../../common/components/LicenseRequired";
import TeamAvailabilityScreen from "../components/TeamAvailabilityScreen";

export function TeamAvailabilityPage() {
  const { t } = useLocale();
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState("");

  const me = useMeQuery();
  const isFreeUser = me.data?.plan === "FREE";

  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery(
    { teamId: Number(router.query.id) },
    {
      refetchOnWindowFocus: false,
      onError: (e) => {
        setErrorMessage(e.message);
      },
    }
  );

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
            size="sm"
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
