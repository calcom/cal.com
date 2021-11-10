import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

import TeamEditor from "@ee/components/team/TeamEditor";

import { handleErrorsJson } from "@lib/errors";
import { Team } from "@lib/team";

import Loader from "@components/Loader";
import TeamsShell from "@components/TeamsShell";

export function TeamTabs() {
  //   const { t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [team, setTeam] = useState<Team>();
  const { id } = router.query;

  const loadTeamsList = () => {
    setLoading(true);
    fetch(`/api/teams/${id}`)
      .then(handleErrorsJson)
      .then((data) => {
        setTeam(data.team);
      })
      .catch(console.log)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTeamsList();
  }, []);

  return (
    <TeamsShell loading={loading} team={team as Team}>
      {loading ? <Loader /> : <TeamEditor team={team} />}
    </TeamsShell>
  );
}

export default TeamTabs;
