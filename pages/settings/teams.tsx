import { PlusIcon } from "@heroicons/react/solid";
import { useSession } from "next-auth/client";
import { useEffect, useState } from "react";

import { handleErrorsJson } from "@lib/errors";
import { useLocale } from "@lib/hooks/useLocale";
import { Member } from "@lib/member";

import Loader from "@components/Loader";
import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import TeamCreateModal from "@components/team/TeamCreateModal";
import TeamList from "@components/team/TeamList";
import Button from "@components/ui/Button";

export default function Teams() {
  const { t } = useLocale();
  const [, loading] = useSession();
  const [teams, setTeams] = useState([]);
  const [invites, setInvites] = useState([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  const loadData = () => {
    fetch("/api/user/membership")
      .then(handleErrorsJson)
      .then((data) => {
        setTeams(data.membership.filter((m: Member) => m.role !== "INVITEE"));
        setInvites(data.membership.filter((m: Member) => m.role === "INVITEE"));
      })
      .catch(console.log);
  };
  const onTeamCreated = () => {
    setShowCreateTeamModal(false);
    loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <Loader />;

  return (
    <Shell heading={t("teams")} subtitle={t("create_manage_teams_collaborative")}>
      <SettingsShell>
        {showCreateTeamModal && (
          <TeamCreateModal onComplete={onTeamCreated} onClose={() => setShowCreateTeamModal(false)} />
        )}
        <div className="flex justify-end my-4">
          <Button type="button" className="btn btn-white" onClick={() => setShowCreateTeamModal(true)}>
            <PlusIcon className="group-hover:text-black text-gray-700 w-3.5 h-3.5 mr-2 inline-block" />
            {t("new_team")}
          </Button>
        </div>
        {invites.length > 0 && (
          <div className="my-8">
            <h1 className="mb-2 text-lg font-medium">{t("open_invitations")}</h1>
            <TeamList teams={invites} onChange={loadData}></TeamList>
          </div>
        )}
        {teams.length > 0 && <TeamList teams={teams} onChange={loadData}></TeamList>}
      </SettingsShell>
    </Shell>
  );
}
