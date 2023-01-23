import { trpc } from "@calcom/trpc/react";

export function useHasTeamPlan() {
  const hasTeam = trpc.viewer.teams.hasTeamPlan.useQuery();

  // TODO: Maybe later disable team plan for e2e tests and let the test create the team plan scenario
  return process.env.NEXT_PUBLIC_IS_E2E || hasTeam.data?.hasTeamPlan || false;
}

export default useHasTeamPlan;
