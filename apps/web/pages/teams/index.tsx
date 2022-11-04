import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import { Button } from "@calcom/ui/components/button";
import { Shell } from "@calcom/ui/v2";
import { Alert } from "@calcom/ui/v2/core/Alert";
import EmptyScreen from "@calcom/ui/v2/core/EmptyScreen";

import SkeletonLoaderTeamList from "@components/team/SkeletonloaderTeamList";
import TeamCreateModal from "@components/team/TeamCreateModal";
import TeamList from "@components/team/TeamList";

function Teams() {
  const { t } = useLocale();
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data, isLoading } = trpc.useQuery(["viewer.teams.list"], {
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  const teams = data?.filter((m) => m.accepted) || [];
  const invites = data?.filter((m) => !m.accepted) || [];

  return (
    <Shell
      heading={t("teams")}
      subtitle={t("create_manage_teams_collaborative")}
      CTA={
        <Button type="button" onClick={() => setShowCreateTeamModal(true)}>
          <Icon.FiPlus className="inline-block h-3.5 w-3.5 text-white group-hover:text-black ltr:mr-2 rtl:ml-2" />
          {t("new")}
        </Button>
      }>
      <>
        {!!errorMessage && <Alert severity="error" title={errorMessage} />}
        {showCreateTeamModal && (
          <TeamCreateModal isOpen={showCreateTeamModal} onClose={() => setShowCreateTeamModal(false)} />
        )}
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
              <Button color="secondary" onClick={() => setShowCreateTeamModal(true)}>
                {t("create_team")}
              </Button>
            }
            buttonOnClick={() => setShowCreateTeamModal(true)}
          />
        )}
        {teams.length > 0 && <TeamList teams={teams} />}
      </>
    </Shell>
  );
}

Teams.requiresLicense = false;

export default Teams;
