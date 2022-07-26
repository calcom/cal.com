import { PlusIcon } from "@heroicons/react/solid";
import { MembershipRole } from "@prisma/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import { SkeletonAvatar, SkeletonText } from "@calcom/ui";
import { Alert } from "@calcom/ui/Alert";
import { Button } from "@calcom/ui/Button";
import SAMLConfiguration from "@ee/components/saml/Configuration";

import { QueryCell } from "@lib/QueryCell";
import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import useCurrentUserId from "@lib/hooks/useCurrentUserId";
import { useLocale } from "@lib/hooks/useLocale";

import Shell from "@components/Shell";
import DisableTeamImpersonation from "@components/team/DisableTeamImpersonation";
import MemberInvitationModal from "@components/team/MemberInvitationModal";
import MemberList from "@components/team/MemberList";
import TeamSettings from "@components/team/TeamSettings";
import TeamSettingsRightSidebar from "@components/team/TeamSettingsRightSidebar";
import { UpgradeToFlexibleProModal } from "@components/team/UpgradeToFlexibleProModal";
import Avatar from "@components/ui/Avatar";

export function TeamSettingsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const userId = useCurrentUserId();

  const upgraded = router.query.upgraded as string;

  useEffect(() => {
    if (upgraded) {
      showToast(t("team_upgraded_successfully"), "success");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const query = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  return (
    <QueryCell
      query={query}
      loading={() => {
        return (
          <Shell
            backPath={!errorMessage ? `/settings/teams` : undefined}
            heading={
              <div className="pt-2">
                <SkeletonText width="16" height="6" />
              </div>
            }
            subtitle={<SkeletonText width="12" height="4" />}
            HeadingLeftIcon={<SkeletonAvatar width="12" height="12" className="mt-1" />}>
            <>
              <div className="block sm:flex md:max-w-5xl">
                <div className="w-full ltr:mr-2 rtl:ml-2 sm:w-9/12">
                  <div className="-mx-0 h-[531px] rounded-sm border border-neutral-200 bg-white px-4 sm:px-6" />
                  <div className="mb-3 mt-7 flex items-center justify-between">
                    <SkeletonText width="12" height="4" />
                  </div>
                  <div className="-mx-0 h-16 rounded-sm border border-neutral-200 bg-white px-4 sm:px-6" />
                </div>
              </div>
            </>
          </Shell>
        );
      }}
      success={({ data: team }) => {
        const isAdmin =
          team &&
          (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);
        return (
          <Shell
            backPath={!errorMessage ? `/settings/teams` : undefined}
            heading={team?.name}
            subtitle={team && t("manage_this_team")}
            HeadingLeftIcon={
              team && (
                <Avatar
                  size={12}
                  imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
                  alt="Team Logo"
                  className="mt-1"
                />
              )
            }>
            {!!errorMessage && <Alert className="-mt-24 border" severity="error" title={errorMessage} />}
            {team && (
              <>
                <div className="block sm:flex md:max-w-5xl">
                  <div className="w-full ltr:mr-2 rtl:ml-2 sm:w-9/12">
                    {team.membership.role === MembershipRole.OWNER &&
                    team.membership.isMissingSeat &&
                    team.requiresUpgrade ? (
                      <Alert
                        severity="warning"
                        title={t("hidden_team_member_title")}
                        message={
                          <>
                            {t("hidden_team_owner_message")} <UpgradeToFlexibleProModal teamId={team.id} />
                            {/* <a href={"https://cal.com/upgrade"} className="underline">
                              {"https://cal.com/upgrade"}
                            </a> */}
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

                    <div className="-mx-0 rounded-sm border border-neutral-200 bg-white px-4 sm:px-6">
                      {isAdmin ? (
                        <TeamSettings team={team} />
                      ) : (
                        <div className="py-5">
                          <span className="mb-1 font-bold">{t("team_info")}</span>
                          <p className="text-sm text-gray-700">{team.bio}</p>
                        </div>
                      )}
                    </div>
                    <div className="mb-3 mt-7 flex items-center justify-between">
                      <h3 className="font-cal text-xl leading-6 text-gray-900">{t("members")}</h3>
                      {isAdmin && (
                        <div className="relative flex items-center">
                          <Button
                            type="button"
                            color="secondary"
                            StartIcon={PlusIcon}
                            onClick={() => setShowMemberInvitationModal(true)}
                            data-testid="new-member-button">
                            {t("new_member")}
                          </Button>
                        </div>
                      )}
                    </div>
                    <MemberList team={team} members={team.members || []} />
                    {isAdmin && <SAMLConfiguration teamsView={true} teamId={team.id} />}
                    {userId && <DisableTeamImpersonation teamId={team.id} memberId={userId} />}
                  </div>
                  <div className="min-w-32 mt-8 w-full px-2 ltr:ml-2 rtl:mr-2 sm:mt-0 md:w-3/12">
                    <TeamSettingsRightSidebar role={team.membership.role} team={team} />
                  </div>
                </div>
                {showMemberInvitationModal && (
                  <MemberInvitationModal
                    isOpen={showMemberInvitationModal}
                    team={team}
                    currentMember={team.membership.role}
                    onExit={() => setShowMemberInvitationModal(false)}
                  />
                )}
              </>
            )}
          </Shell>
        );
      }}
    />
  );
}

export default TeamSettingsPage;
