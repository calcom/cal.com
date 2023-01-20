import { trpc } from "@calcom/trpc/react";

export function useHasTeamPlan() {
  const hasTeam = trpc.viewer.teams.hasTeamPlan.useQuery();

  return hasTeam.data?.hasTeamPlan || false;
}

export default useHasTeamPlan;
