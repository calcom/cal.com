import { trpc } from "@calcom/trpc/react";

export const useIsInTeam = () => {
  const { data, isLoading } = trpc.viewer.teams.list.useQuery(undefined, {});
  const teams = data?.filter((team) => team.accepted) || [];
  return {
    isLoading,
    isInTeam: teams.length > 0,
  };
};
