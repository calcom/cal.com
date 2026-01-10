import { useSession } from "next-auth/react";
import { useContext } from "react";

import { InsightsOrgTeamsContext } from "../components/context/InsightsOrgTeamsProvider";

export function useInsightsOrgTeams() {
  const context = useContext(InsightsOrgTeamsContext);
  if (!context) {
    throw new Error("useInsightsOrgTeams must be used within a InsightsOrgTeamsProvider");
  }
  const session = useSession();
  const currentOrgId = session.data?.user.org?.id;
  const { orgTeamsType, selectedTeamId, setOrgTeamsType, setSelectedTeamId } = context;
  const isAll = orgTeamsType === "org";
  const teamId = orgTeamsType === "org" ? currentOrgId : orgTeamsType === "team" ? selectedTeamId : undefined;
  const userId = orgTeamsType === "yours" ? session.data?.user.id : undefined;

  // Adding `scope` for InsightsRoutingBaseService
  // (renaming 'yours' to 'user')
  const scope: "org" | "team" | "user" = orgTeamsType === "yours" ? "user" : orgTeamsType;

  return {
    orgTeamsType,
    setOrgTeamsType,
    selectedTeamId,
    setSelectedTeamId,
    isAll,
    teamId,
    userId,
    scope,
  };
}
