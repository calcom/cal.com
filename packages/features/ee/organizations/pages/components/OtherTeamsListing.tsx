import { useState } from "react";

import SkeletonLoaderTeamList from "@calcom/ee/teams/components/SkeletonloaderTeamList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, EmptyScreen } from "@calcom/ui";

import OtherTeamList from "./OtherTeamList";

export function OtherTeamsListing() {
  const { t } = useLocale();

  const [errorMessage, setErrorMessage] = useState("");

  const { data: teams, isLoading } = trpc.viewer.organizations.listOtherTeams.useQuery(undefined, {
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  if (isLoading) {
    return <SkeletonLoaderTeamList />;
  }

  return (
    <>
      {!!errorMessage && <Alert severity="error" title={errorMessage} />}

      {teams && teams.length > 0 ? (
        <OtherTeamList teams={teams} />
      ) : (
        <EmptyScreen
          headline={t("no_other_teams_found")}
          title={t("no_other_teams_found")}
          description={t("no_other_teams_found_description")}
        />
      )}
    </>
  );
}
