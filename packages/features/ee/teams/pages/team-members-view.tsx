"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import DisableTeamImpersonation from "../components/DisableTeamImpersonation";
import InviteLinkSettingsModal from "../components/InviteLinkSettingsModal";
import MakeTeamPrivateSwitch from "../components/MakeTeamPrivateSwitch";
import { MemberInvitationModalWithoutMembers } from "../components/MemberInvitationModal";
import MemberList from "../components/MemberList";
import TeamInviteList from "../components/TeamInviteList";

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

  const isPending = isTeamsLoading;

  const isInviteOpen = !team?.membership.accepted;

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  const isOrgAdminOrOwner = org?.role === MembershipRole.OWNER || org?.role === MembershipRole.ADMIN;

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

            {team && session.data && (
              <DisableTeamImpersonation
                teamId={team.id}
                memberId={session.data.user.id}
                disabled={isInviteOpen}
              />
            )}

            {team && team.id && (isAdmin || isOrgAdminOrOwner) && (
              <MakeTeamPrivateSwitch
                isOrg={false}
                teamId={team.id}
                isPrivate={team.isPrivate ?? false}
                disabled={isInviteOpen}
              />
            )}
          </div>
        </>
      )}
    </>
  );
};

export default MembersView;
