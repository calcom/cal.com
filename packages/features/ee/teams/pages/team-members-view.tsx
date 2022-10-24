import { MembershipRole } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import { Alert, Button } from "@calcom/ui/v2/core";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

import DisableTeamImpersonation from "../components/DisableTeamImpersonation";
import MemberInvitationModal from "../components/MemberInvitationModal";
import MemberListItem from "../components/MemberListItem";
import TeamInviteList from "../components/TeamInviteList";

const MembersView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();

  const { data: team, isLoading } = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    onError: () => {
      router.push("/settings");
    },
  });

  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);

  const isInviteOpen = !team?.membership.accepted;

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  return (
    <>
      <Meta title="Team Members" description="Users that are in the group" />
      {!isLoading && (
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
                        logo: team.logo,
                        name: team.name,
                        slug: team.slug,
                        role: team.membership.role,
                      },
                    ]}
                  />
                )}
              </>
            )}
            {isAdmin && (
              <div className="relative mb-5 flex w-full items-center ">
                <Button
                  type="button"
                  color="primary"
                  StartIcon={Icon.FiPlus}
                  className="ml-auto"
                  onClick={() => setShowMemberInvitationModal(true)}
                  data-testid="new-member-button">
                  {t("add")}
                </Button>
              </div>
            )}
            <div>
              <ul className="divide-y divide-gray-200 rounded-md border ">
                {team?.members.map((member) => {
                  return <MemberListItem key={member.id} team={team} member={member} />;
                })}
              </ul>
            </div>
            <hr className="my-8 border-gray-200" />

            {team && session.data && (
              <DisableTeamImpersonation
                teamId={team.id}
                memberId={session.data.user.id}
                disabled={isInviteOpen}
              />
            )}
            <hr className="my-8 border-gray-200" />
          </div>
          {showMemberInvitationModal && team && (
            <MemberInvitationModal
              isOpen={showMemberInvitationModal}
              team={team}
              currentMember={team.membership.role}
              onExit={() => setShowMemberInvitationModal(false)}
            />
          )}
        </>
      )}
    </>
  );
};

MembersView.getLayout = getLayout;

export default MembersView;
