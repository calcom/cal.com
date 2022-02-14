import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import TeamAvailabilityScreen from "@ee/components/team/availability/TeamAvailabilityScreen";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";
import Shell, { useMeQuery } from "@components/Shell";
import { Alert } from "@components/ui/Alert";
import Avatar from "@components/ui/Avatar";

export function TeamAvailabilityPage() {
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
      {!!errorMessage && <Alert className="-mt-24 border" severity="error" title={errorMessage} />}
      {isLoading && <Loader />}
      {isFreeUser ? (
        <Alert
          className="-mt-24 border"
          severity="warning"
          title="This is a pro feature. Upgrade to pro to see your team's availability."
        />
      ) : (
        TeamAvailability
      )}
    </Shell>
  );
}

export default TeamAvailabilityPage;
