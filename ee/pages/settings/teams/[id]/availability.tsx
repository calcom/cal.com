import { useRouter } from "next/router";
import { useState } from "react";

import TeamAvailabilityScreen from "@ee/components/team/availability/TeamAvailabilityScreen";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";
import Shell from "@components/Shell";
import { Alert } from "@components/ui/Alert";
import Avatar from "@components/ui/Avatar";

export function TeamSettingsPage() {
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState("");

  const { data: team, isLoading } = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    refetchOnWindowFocus: false,
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  return (
    <Shell
      showBackButton={!errorMessage}
      heading={team?.name}
      flexChildrenContainer
      subtitle={team && "Your team's availability at a glance"}
      HeadingLeftIcon={
        team && (
          <Avatar
            size={12}
            imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
            alt="Team Logo"
            className="mt-1"
          />
        )
      }>
      {!!errorMessage && <Alert className="-mt-24 border" severity="error" title={errorMessage} />}
      {isLoading && <Loader />}
      {team && <TeamAvailabilityScreen team={team} members={team.members} />}
    </Shell>
  );
}

export default TeamSettingsPage;
