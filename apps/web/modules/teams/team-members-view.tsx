"use client";

import { AddTeamMemberModal } from "@calid/features/modules/teams/components/AddTeamMemberModal";
import { TeamMembersList } from "@calid/features/modules/teams/components/TeamMembersList";
import { useState } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";

interface TeamMembersViewProps {
  team: NonNullable<RouterOutputs["viewer"]["calidTeams"]["get"]>;
  facetedTeamValues?: {
    roles: { id: string; name: string }[];
    teams: RouterOutputs["viewer"]["calidTeams"]["get"][];
    attributes: {
      id: string;
      name: string;
      options: {
        value: string;
      }[];
    }[];
  };
  attributes?: unknown[];
}

export const TeamMembersView = ({ team, facetedTeamValues: _facetedTeamValues }: TeamMembersViewProps) => {
  const { t } = useLocale();
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);
  const [_showInviteLinkSettingsModal, _setShowInviteLinkSettingsModal] = useState(false);

  const isTeamAdminOrOwner = checkAdminOrOwner(team.membership.role);
  const canLoggedInUserSeeMembers = !team.isPrivate || isTeamAdminOrOwner;

  return (
    <div>
      {canLoggedInUserSeeMembers && (
        <div className="mb-6">
          <TeamMembersList team={team} onInviteClick={() => setShowMemberInvitationModal(true)} />
        </div>
      )}
      {!canLoggedInUserSeeMembers && (
        <div className="border-subtle rounded-xl border p-6" data-testid="members-privacy-warning">
          <h2 className="text-default">{t("only_admin_can_see_members_of_team")}</h2>
        </div>
      )}
      {showMemberInvitationModal && team && team.id && (
        <AddTeamMemberModal
          teamId={team.id}
          teamName={team.name}
          onSuccess={() => setShowMemberInvitationModal(false)}
        />
      )}
    </div>
  );
};
