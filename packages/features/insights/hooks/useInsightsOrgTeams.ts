import { useSession } from "next-auth/react";
import { useContext } from "react";

import { InsightsOrgTeamsContext } from "../context/InsightsOrgTeamsProvider";

export function useInsightsOrgTeams() {
  const context = useContext(InsightsOrgTeamsContext);
  if (!context) {
    throw new Error("useInsightsOrgTeams must be used within a InsightsOrgTeamsProvider");
  }
  const { orgTeamsType, selectedTeamId, setOrgTeamsType, setSelectedTeamId } = context;
  const session = useSession();
  const isAll = orgTeamsType === "org";
  const teamId = orgTeamsType === "team" ? selectedTeamId : undefined;
  const userId = orgTeamsType === "yours" ? session.data?.user.id : undefined;

  return {
    orgTeamsType,
    setOrgTeamsType,
    selectedTeamId,
    setSelectedTeamId,
    isAll,
    teamId,
    userId,
  };
}
