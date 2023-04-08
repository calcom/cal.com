import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { trpc } from "@calcom/trpc/react";
import { Alert, Avatar, Loader, Shell } from "@calcom/ui";

import LicenseRequired from "../../common/components/LicenseRequired";
import TeamAvailabilityScreen from "../components/TeamAvailabilityScreen";

export function TeamAvailabilityPage() {
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState("");

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
      heading={team?.name}
      flexChildrenContainer
      subtitle={team && "Your team's availability at a glance"}
      HeadingLeftIcon={
        team && (
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
        {TeamAvailability}
      </LicenseRequired>
    </Shell>
  );
}

export default TeamAvailabilityPage;
