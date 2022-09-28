import { MembershipRole } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, Fragment } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import { Alert, Button } from "@calcom/ui/v2/core";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import { SkeletonContainer, SkeletonText, SkeletonButton, SkeletonAvatar } from "@calcom/ui/v2/core/skeleton";

import DisableTeamImpersonation from "../components/DisableTeamImpersonation";
import MemberInvitationModal from "../components/MemberInvitationModal";
import MemberListItem from "../components/MemberListItem";
import TeamInviteList from "../components/TeamInviteList";
import { UpgradeToFlexibleProModal } from "../components/UpgradeToFlexibleProModal";

const MembersView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();

  const queryTeam = () => {
    const teamQuery = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
      onError: () => {
        router.push("/settings");
      },
    });
    const memberQuery = trpc.useInfiniteQuery(
      ["viewer.teams.getMembers", { teamId: Number(router.query.id), limit: 5 }],
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );
    return [teamQuery, memberQuery];
  };

  const [
    { data: team, isLoading },
    { data: teamMemebers, isLoading: memberLoading, hasNextPage, fetchNextPage, isFetchingNextPage },
  ] = queryTeam();

  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);

  const isInviteOpen = !team?.membership.accepted;

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  if (isLoading || memberLoading) return <SkeletonLoader />;

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
                {team.membership.role === MembershipRole.OWNER &&
                team.membership.isMissingSeat &&
                team.requiresUpgrade ? (
                  <Alert
                    severity="warning"
                    title={t("hidden_team_member_title")}
                    message={
                      <>
                        {t("hidden_team_owner_message")} <UpgradeToFlexibleProModal teamId={team.id} />
                      </>
                    }
                    className="mb-4 "
                  />
                ) : (
                  <>
                    {team.membership.isMissingSeat && (
                      <Alert
                        severity="warning"
                        title={t("hidden_team_member_title")}
                        message={t("hidden_team_member_message")}
                        className="mb-4 "
                      />
                    )}
                    {team.membership.role === MembershipRole.OWNER && team.requiresUpgrade && (
                      <Alert
                        severity="warning"
                        title={t("upgrade_to_flexible_pro_title")}
                        message={
                          <span>
                            {t("upgrade_to_flexible_pro_message")} <br />
                            <UpgradeToFlexibleProModal teamId={team.id} />
                          </span>
                        }
                        className="mb-4"
                      />
                    )}
                  </>
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
            {teamMemebers && (
              <div>
                <ul className="divide-y divide-gray-200 rounded-md border ">
                  {teamMemebers.pages.map((page, index) => (
                    <Fragment key={index}>
                      {page.members.map((member) => (
                        <MemberListItem key={member.id} team={team} member={member} />
                      ))}
                    </Fragment>
                  ))}
                </ul>
                {hasNextPage && (
                  <Button
                    color="secondary"
                    loading={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                    className="mt-6">
                    {t("load_more_members")}
                  </Button>
                )}
              </div>
            )}

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

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <SkeletonButton className="ml-auto h-9 w-24 rounded-md" />
      <ul className="mt-6 divide-y divide-gray-200 rounded-md border">
        <SkeletonTeamMember />
        <SkeletonTeamMember />
        <SkeletonTeamMember />
        <SkeletonTeamMember />
      </ul>

      <hr className="my-8 border-gray-200" />

      <div className="flex items-center justify-between">
        <SkeletonText className="h-8 w-2/5" />
        <SkeletonButton className="ml-auto h-9 w-24 rounded-md" />
      </div>
    </SkeletonContainer>
  );
};

const SkeletonTeamMember = () => {
  return (
    <li className="divide-y px-5">
      <div className="my-4 flex justify-between">
        <div className="flex w-full flex-col justify-between sm:flex-row">
          <div className="flex w-full items-center">
            <SkeletonAvatar className="h-10 w-10 rounded-full" />
            <SkeletonText className="h-8 w-2/5" />
            <SkeletonButton className="ml-80 h-9 w-24 rounded-md" />
          </div>
        </div>
      </div>
    </li>
  );
};
