import classNames from "classnames";
import { Trans } from "next-i18next";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import EmptyScreen from "@calcom/ui/EmptyScreen";
import { Icon } from "@calcom/ui/Icon";

import useMeQuery from "@lib/hooks/useMeQuery";

import SettingsShell from "@components/SettingsShell";
import SkeletonLoaderTeamList from "@components/team/SkeletonloaderTeamList";
import TeamCreateModal from "@components/team/TeamCreateModal";
import TeamList from "@components/team/TeamList";

function Teams() {
  const { t } = useLocale();
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const me = useMeQuery();

  const { data, isLoading } = trpc.useQuery(["viewer.teams.list"], {
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  const teams = data?.filter((m) => m.accepted) || [];
  const invites = data?.filter((m) => !m.accepted) || [];
  const isFreePlan = me.data?.plan === "FREE";

  return (
    <SettingsShell heading={t("teams")} subtitle={t("create_manage_teams_collaborative")}>
      <>
        {!!errorMessage && <Alert severity="error" title={errorMessage} />}
        {isFreePlan && (
          <Alert
            severity="warning"
            title={<>{t("plan_upgrade_teams")}</>}
            message={
              <Trans i18nKey="plan_upgrade_instructions">
                You can
                <a href="/api/upgrade" className="underline">
                  upgrade here
                </a>
                .
              </Trans>
            }
            className="my-4"
          />
        )}
        {showCreateTeamModal && (
          <TeamCreateModal isOpen={showCreateTeamModal} onClose={() => setShowCreateTeamModal(false)} />
        )}
        <div className={classNames("my-4 flex justify-end", isFreePlan && "opacity-50")}>
          <Button
            disabled={isFreePlan}
            type="button"
            color="secondary"
            onClick={() => setShowCreateTeamModal(true)}>
            <Icon.FiPlus className="inline-block h-3.5 w-3.5 text-gray-700 group-hover:text-black ltr:mr-2 rtl:ml-2" />
            {t("new_team")}
          </Button>
        </div>

        {invites.length > 0 && (
          <div className="mb-4">
            <h1 className="mb-2 text-lg font-medium">{t("open_invitations")}</h1>
            <TeamList teams={invites} />
          </div>
        )}
        {isLoading && <SkeletonLoaderTeamList />}
        {!teams.length && !isLoading && (
          <EmptyScreen Icon={Icon.FiUsers} headline={t("no_teams")} description={t("no_teams_description")} />
        )}
        {teams.length > 0 && <TeamList teams={teams} />}
      </>
    </SettingsShell>
  );
}

Teams.requiresLicense = false;

export default Teams;
