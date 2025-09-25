"use client";

import TeamMembersList from "@calid/features/modules/teams/components/TeamMembersList";
import { checkIfMemberAdminorOwner } from "@calid/features/modules/teams/lib/checkIfMemberAdminorOwner";
import { useRouter } from "next/navigation";

import { trpc } from "@calcom/trpc";

export default function TeamMembersView({ teamId }: { teamId: number }) {
  const router = useRouter();
  const {
    data: team,
    isLoading: isLoading,
    error: error,
  } = trpc.viewer.calidTeams.get.useQuery(
    {
      teamId,
    },
    {
      enabled: !!teamId,
    }
  );

  const isAdmin = checkIfMemberAdminorOwner(team?.membership.role);

  if (error) {
    router.push("/teams");
  }

  return (
    <>
      {((team?.isTeamPrivate && isAdmin) || !team?.isTeamPrivate || isAdmin) && team && (
        <div className="space-y-6">
          <TeamMembersList team={team} />
        </div>
      )}
    </>
  );
}
