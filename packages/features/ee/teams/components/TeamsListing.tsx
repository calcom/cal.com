import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import { Button } from "@calcom/ui/components/button";
import { Alert } from "@calcom/ui/v2/core/Alert";
import EmptyScreen from "@calcom/ui/v2/core/EmptyScreen";

import SkeletonLoaderTeamList from "./SkeletonloaderTeamList";
import TeamList from "./TeamList";

export function TeamsListing() {
  const { t } = useLocale();
  const [errorMessage, setErrorMessage] = useState("");

  const { data, isLoading } = trpc.viewer.teams.list.useQuery(undefined, {
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  const teams = data?.filter((m) => m.accepted) || [];
  const invites = data?.filter((m) => !m.accepted) || [];

  return (
    <>
      {!!errorMessage && <Alert severity="error" title={errorMessage} />}
      {invites.length > 0 && (
        <div className="mb-4">
          <h1 className="mb-2 text-lg font-medium">{t("open_invitations")}</h1>
          <TeamList teams={invites} />
        </div>
      )}
      {isLoading && <SkeletonLoaderTeamList />}
      {!teams.length && !isLoading && (
        <EmptyScreen
          Icon={Icon.FiUsers}
          headline={t("no_teams")}
          description={t("no_teams_description")}
          buttonRaw={
            <Button color="secondary" href={`${WEBAPP_URL}/settings/teams/new`}>
              {t("create_team")}
            </Button>
          }
        />
      )}
      {teams.length > 0 && <TeamList teams={teams} />}
    </>
  );
}
