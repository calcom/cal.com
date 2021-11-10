import { PlusIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import { OptionTypeBase } from "react-select";

// import TeamAvailability from "@ee/components/team/TeamAvailability";
import TeamList from "@ee/components/team/TeamList";

import { handleErrorsJson } from "@lib/errors";
import { useLocale } from "@lib/hooks/useLocale";
import { Member } from "@lib/member";
import { Team } from "@lib/team";

import Loader from "@components/Loader";
import Shell from "@components/Shell";
import Button from "@components/ui/Button";

export default function TeamPage() {
  const { t } = useLocale();
  const [teams, setTeams] = useState<Team[]>([]);
  const [invites, setInvites] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<OptionTypeBase>({});
  const [loading, setLoading] = useState<boolean>(true);

  const hasSelectedTeam = selectedTeam?.value !== undefined;

  const loadTeamsList = () => {
    setLoading(true);
    fetch("/api/user/membership")
      .then(handleErrorsJson)
      .then((data) => {
        setTeams(data.membership.filter((m: Member) => m.role !== "INVITEE"));
        setInvites(data.membership.filter((m: Member) => m.role === "INVITEE"));
      })
      .catch(console.log)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTeamsList();
  }, []);

  // construct input dropdown select data
  const inputOptions: OptionTypeBase[] = teams.map((team, index) => ({
    value: team.id,
    label: team.name,
    index,
  }));
  // select default item
  useEffect(() => {
    if (!hasSelectedTeam) setSelectedTeam(inputOptions[0]);
  }, [inputOptions, hasSelectedTeam]);

  return (
    <Shell
      CTA={
        <Button type="button" className="btn btn-black">
          <PlusIcon className="group-hover:text-white text-white w-3.5 h-3.5 mr-2 inline-block" />
          {t("new_team")}
        </Button>
      }
      heading={"Teams"}
      subtitle={"It's easy to get your team on Cal"}>
      {loading && <Loader />}
      {invites.length > 0 && (
        <div className="mb-8">
          <h1 className="mb-2 text-lg font-medium font-">Open Invitations</h1>
          <TeamList teams={invites} onChange={loadTeamsList}></TeamList>
        </div>
      )}
      {teams.length > 0 && <TeamList teams={teams} onChange={loadTeamsList}></TeamList>}
    </Shell>
  );
}
