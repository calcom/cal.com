import { useState } from "react";

import { UpgradeToTeamsBanner, TeamFeatures } from "@calcom/features/teams";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, EmptyScreen, Icon } from "@calcom/ui";

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

      {teams.length === 0 && (
        <>
          <UpgradeToTeamsBanner>
            <UpgradeToTeamsBanner.Title>{t("calcom_is_better_with_team")}</UpgradeToTeamsBanner.Title>
            <UpgradeToTeamsBanner.Description>{t("add_your_team_members")}</UpgradeToTeamsBanner.Description>
            <UpgradeToTeamsBanner.Buttons>
              <>
                <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                  {t("create_team")}
                </Button>
                <Button color="secondary" href="https://go.cal.com/teams-video" target="_blank">
                  {t("learn_more")}
                </Button>
              </>
            </UpgradeToTeamsBanner.Buttons>
          </UpgradeToTeamsBanner>
          <div className="mt-4">
            <TeamFeatures />
          </div>
        </>
      )}

      {teams.length > 0 && (
        <>
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
          <TeamList teams={teams} />
        </>
      )}
    </>
  );
}
