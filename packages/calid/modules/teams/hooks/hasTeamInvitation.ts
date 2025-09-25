import { trpc } from "@calcom/trpc/react";

export const hasTeamInvitation = () => {
  const { data: hasPendingInvitations, isLoading } = trpc.viewer.calidTeams.listPendingInvitations.useQuery();

  return {
    hasPendingInvitations: hasPendingInvitations ?? false,
    isLoading,
  };
};
