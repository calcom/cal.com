"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import type { MemberPermissions } from "@calcom/features/users/components/UserTable/types";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";

import InviteLinkSettingsModal from "../components/InviteLinkSettingsModal";
import { MemberInvitationModalWithoutMembers } from "../components/MemberInvitationModal";
import MemberList from "../components/MemberList";
import TeamInviteList from "../components/TeamInviteList";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const MembersView = () => {
  const { t } = useLocale();
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);
  const [showInviteLinkSettingsModal, setInviteLinkSettingsModal] = useState(false);
  const router = useRouter();
  const session = useSession();
  const org = session?.data?.user.org;
  const params = useParamsWithFallback();

  const teamId = Number(params.id);

  const {
    data: team,
    isPending: isTeamsLoading,
    error: teamError,
  } = trpc.viewer.teams.get.useQuery(
    { teamId },
    {
      enabled: !!teamId,
    }
  );
  useEffect(
    function refactorMeWithoutEffect() {
      if (teamError) {
        router.replace("/teams");
      }
    },
    [teamError]
  );

  // Get permissions from server using PBAC (with fallback to role-based)
  const { data: permissions, isPending: isPermissionsLoading } =
    trpc.viewer.pbac.getTeamMemberPermissions.useQuery(
      { teamId },
      {
        enabled: !!teamId && !!team,
      }
    );

  const isPending = isTeamsLoading || isPermissionsLoading;

  const isInviteOpen = !team?.membership.accepted;

  const isAdmin = team && checkAdminOrOwner(team.membership.role);

  const isOrgAdminOrOwner = checkAdminOrOwner(org?.role);

  const fallbackPermissions: MemberPermissions = {
    canListMembers: false,
    canInvite: false,
    canChangeMemberRole: false,
    canRemove: false,
    canImpersonate: false,
  };

  const memberPermissions = permissions ?? fallbackPermissions;

  const hideInvitationModal = () => {
    setShowMemberInvitationModal(false);
  };

  return (
    <>
      {!isPending && (
        <>
          <div>
            {team && (
              <>
                {isInviteOpen && (
                  <TeamInviteList
                    teams={[
                      {
                        id: team.id,
                        accepted: team.membership.accepted || false,
                        name: team.name,
                        slug: team.slug,
                        role: team.membership.role,
                      },
                    ]}
                  />
                )}
              </>
            )}

            {((team?.isPrivate && isAdmin) || !team?.isPrivate || isOrgAdminOrOwner) && team && (
              <div className="mb-6">
                <MemberList
                  team={team}
                  isOrgAdminOrOwner={isOrgAdminOrOwner}
                  setShowMemberInvitationModal={setShowMemberInvitationModal}
                  permissions={memberPermissions}
                />
              </div>
            )}
            {showMemberInvitationModal && team && team.id && (
              <MemberInvitationModalWithoutMembers
                hideInvitationModal={hideInvitationModal}
                showMemberInvitationModal={showMemberInvitationModal}
                teamId={team.id}
                token={team.inviteToken?.token}
                onSettingsOpen={() => setInviteLinkSettingsModal(true)}
              />
            )}

            {showInviteLinkSettingsModal && team?.inviteToken && team.id && (
              <InviteLinkSettingsModal
                isOpen={showInviteLinkSettingsModal}
                teamId={team.id}
                token={team.inviteToken.token}
                expiresInDays={team.inviteToken.expiresInDays || undefined}
                onExit={() => {
                  setInviteLinkSettingsModal(false);
                  setShowMemberInvitationModal(true);
                }}
              />
            )}
          </div>
        </>
      )}
    </>
  );
};

export default MembersView;
