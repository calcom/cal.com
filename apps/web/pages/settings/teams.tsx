import { PlusIcon, UserGroupIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import { useSession } from "next-auth/react";
import { Trans } from "next-i18next";
import { useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import { trpc } from "@lib/trpc";

import EmptyScreen from "@components/EmptyScreen";
import Loader from "@components/Loader";
import SettingsShell from "@components/SettingsShell";
import Shell, { useMeQuery } from "@components/Shell";
import TeamCreateModal from "@components/team/TeamCreateModal";
import TeamList from "@components/team/TeamList";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";

export default function Teams() {
  const { t } = useLocale();
  const { status } = useSession();
  const loading = status === "loading";
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const me = useMeQuery();

  const { data, isLoading } = trpc.useQuery(["viewer.teams.list"], {
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  if (loading) return <Loader />;

  const teams = data?.filter((m) => m.accepted) || [];
  const invites = data?.filter((m) => !m.accepted) || [];
  const isFreePlan = me.data?.plan === "FREE";

  return (
    <Shell heading={t("teams")} subtitle={t("create_manage_teams_collaborative")}>
      <SettingsShell>
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
        {showCreateTeamModal && <TeamCreateModal onClose={() => setShowCreateTeamModal(false)} />}
        <div className={classNames("my-4 flex justify-end", isFreePlan && "opacity-50")}>
          <Button
            disabled={isFreePlan}
            type="button"
            className="btn btn-white"
            onClick={() => setShowCreateTeamModal(true)}>
            <PlusIcon className="inline-block h-3.5 w-3.5 text-gray-700 group-hover:text-black ltr:mr-2 rtl:ml-2" />
            {t("new_team")}
          </Button>
        </div>

        {invites.length > 0 && (
          <div className="mb-4">
            <h1 className="mb-2 text-lg font-medium">{t("open_invitations")}</h1>
            <TeamList teams={invites}></TeamList>
          </div>
        )}
        {!isLoading && !teams.length && (
          <EmptyScreen
            Icon={UserGroupIcon}
            headline={t("no_teams")}
            description={t("no_teams_description")}
          />
        )}
        {teams.length > 0 && <TeamList teams={teams}></TeamList>}
      </SettingsShell>
    </Shell>
  );
}
