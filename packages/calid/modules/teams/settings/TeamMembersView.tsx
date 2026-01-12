"use client";

import TeamMembersList from "@calid/features/modules/teams/components/TeamMembersList";
import { checkIfMemberAdminorOwner } from "@calid/features/modules/teams/lib/checkIfMemberAdminorOwner";
import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

export default function TeamMembersView({ teamId }: { teamId: number }) {
  const { t } = useLocale();
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

  const canSeeMembers = team && (!team.isTeamPrivate || isAdmin);

  return (
    <>
      {canSeeMembers && (
        <div className="space-y-6">
          <TeamMembersList team={team} />
        </div>
      )}
      {team && !canSeeMembers && (
        <div className="border-subtle rounded-md border p-4" data-testid="members-privacy-warning">
          <h2 className="text-default text-sm">{t("only_admin_can_see_members_of_team")}</h2>
        </div>
      )}
    </>
  );
}
