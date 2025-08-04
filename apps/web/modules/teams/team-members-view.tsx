"use client";

import { useState } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { MemberInvitationModalWithoutMembers } from "@calcom/features/ee/teams/components/MemberInvitationModal";
import MemberList from "@calcom/features/ee/teams/components/MemberList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";

interface TeamMembersViewProps {
  team: NonNullable<RouterOutputs["viewer"]["teams"]["get"]>;
  facetedTeamValues?: {
    roles: { id: string; name: string }[];
    teams: RouterOutputs["viewer"]["teams"]["get"][];
    attributes: {
      id: string;
      name: string;
      options: {
        value: string;
      }[];
    }[];
  };
  attributes?: any[];
}

export const TeamMembersView = ({ team, facetedTeamValues }: TeamMembersViewProps) => {
  const { t } = useLocale();
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);
  const [showInviteLinkSettingsModal, setShowInviteLinkSettingsModal] = useState(false);

  const isTeamAdminOrOwner = checkAdminOrOwner(team.membership.role);
  const canLoggedInUserSeeMembers = !team.isPrivate || isTeamAdminOrOwner;

  return (
    <LicenseRequired>
      <div>
        {canLoggedInUserSeeMembers && (
          <div className="mb-6">
            <MemberList
              team={team}
              isOrgAdminOrOwner={false}
              setShowMemberInvitationModal={setShowMemberInvitationModal}
              facetedTeamValues={facetedTeamValues}
            />
          </div>
        )}
        {!canLoggedInUserSeeMembers && (
          <div className="border-subtle rounded-xl border p-6" data-testid="members-privacy-warning">
            <h2 className="text-default">{t("only_admin_can_see_members_of_team")}</h2>
          </div>
        )}
        {showMemberInvitationModal && team && team.id && (
          <MemberInvitationModalWithoutMembers
            hideInvitationModal={() => setShowMemberInvitationModal(false)}
            showMemberInvitationModal={showMemberInvitationModal}
            teamId={team.id}
            token={team.inviteToken?.token}
            onSettingsOpen={() => setShowInviteLinkSettingsModal(true)}
          />
        )}
      </div>
    </LicenseRequired>
  );
};
