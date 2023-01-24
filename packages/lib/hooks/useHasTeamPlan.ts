import { trpc } from "@calcom/trpc/react";

export function useHasTeamPlan() {
  const hasTeam = trpc.viewer.teams.hasTeamPlan.useQuery();

  return { isLoading: hasTeam.isLoading, hasTeamPlan: hasTeam.data?.hasTeamPlan || false };
}

export function useTeamInvites() {
  const listInvites = trpc.viewer.teams.listInvites.useQuery();

  return { isLoading: listInvites.isLoading, listInvites: listInvites.data };
}

export default useHasTeamPlan;
