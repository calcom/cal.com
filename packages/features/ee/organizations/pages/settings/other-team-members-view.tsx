"use client";

// import { debounce } from "lodash";
import { keepPreviousData } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import MemberInvitationModal from "@calcom/ee/teams/components/MemberInvitationModal";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { showToast, Button } from "@calcom/ui";

import MakeTeamPrivateSwitch from "../../../teams/components/MakeTeamPrivateSwitch";
import MemberListItem from "../components/MemberListItem";

type Members = RouterOutputs["viewer"]["organizations"]["listOtherTeamMembers"]["rows"];
type Team = RouterOutputs["viewer"]["organizations"]["getOtherTeam"];

interface MembersListProps {
  members: Members | undefined;
  team: Team | undefined;
  fetchNextPage: () => void;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean | undefined;
}

function MembersList(props: MembersListProps) {
  const { t } = useLocale();
  const { hasNextPage, members = [], team, fetchNextPage, isFetchingNextPage } = props;

  return (
    <div className="flex flex-col gap-y-3">
      {members?.length && team ? (
        <ul className="divide-subtle border-subtle divide-y rounded-md border ">
          {members.map((member) => {
            return <MemberListItem key={member.id} member={member} />;
          })}
        </ul>
      ) : null}
      {members?.length === 0 && (
        <div className="flex flex-col items-center justify-center">
          <p className="text-default text-sm font-bold">{t("no_members_found")}</p>
        </div>
      )}
      <div className="text-default p-4 text-center">
        <Button
          color="minimal"
          loading={isFetchingNextPage}
          disabled={!hasNextPage}
          onClick={() => fetchNextPage()}>
          {hasNextPage ? t("load_more_results") : t("no_more_results")}
        </Button>
      </div>
    </div>
  );
}

export const memberInvitationModalRef = {
  current: null as null | ((show: boolean) => void),
};

export const TeamMembersCTA = () => {
  const { t } = useLocale();
  const session = useSession();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    enabled: !!session.data?.user?.org,
  });

  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  if (!isOrgAdminOrOwner) return null;

  return (
    <Button
      type="button"
      color="primary"
      StartIcon="plus"
      className="ml-auto"
      onClick={() => memberInvitationModalRef.current?.(true)}
      data-testid="new-member-button">
      {t("add")}
    </Button>
  );
};

const MembersView = () => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const params = useParamsWithFallback();
  const teamId = Number(params.id);
  const session = useSession();
  const utils = trpc.useUtils();
  // const [query, setQuery] = useState<string | undefined>("");
  // const [queryToFetch, setQueryToFetch] = useState<string | undefined>("");
  const limit = 20;
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState<boolean>(false);

  const {
    data: team,
    isPending: isTeamLoading,
    error: otherTeamError,
  } = trpc.viewer.organizations.getOtherTeam.useQuery(
    { teamId },
    {
      enabled: !Number.isNaN(teamId),
    }
  );
  const { data: orgMembersNotInThisTeam, isPending: isOrgListLoading } =
    trpc.viewer.organizations.getMembers.useQuery(
      {
        teamIdToExclude: teamId,
        distinctUser: true,
      },
      {
        enabled: !Number.isNaN(teamId),
      }
    );

  const {
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
    error: otherMembersError,
    data,
  } = trpc.viewer.organizations.listOtherTeamMembers.useInfiniteQuery(
    { teamId, limit },
    {
      enabled: !Number.isNaN(teamId),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
    }
  );

  useEffect(
    function refactorMeWithoutEffect() {
      if (otherMembersError || otherTeamError) {
        router.replace("/enterprise");
      }
    },
    [router, otherMembersError, otherTeamError]
  );

  useEffect(() => {
    memberInvitationModalRef.current = setShowMemberInvitationModal;
    return () => {
      memberInvitationModalRef.current = null;
    };
  }, []);

  const isPending = isTeamLoading || isOrgListLoading;
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: () => {
      utils.viewer.organizations.getMembers.invalidate();
      utils.viewer.organizations.listOtherTeams.invalidate();
      utils.viewer.teams.list.invalidate();
      utils.viewer.organizations.listOtherTeamMembers.invalidate();
    },
  });

  return (
    <>
      {!isPending && (
        <>
          <div>
            <>
              {/* Currently failing due to re render and loose focus */}
              {/* <TextField
                type="search"
                autoComplete="false"
                onChange={(e) => {
                  setQuery(e.target.value);
                  debouncedFunction(e.target.value);
                }}
                value={query}
                placeholder={`${t("search")}...`}
              /> */}
              <MembersList
                members={data?.pages?.flatMap((page) => page.rows) ?? []}
                team={team}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            </>

            {team && (
              <>
                <hr className="border-subtle my-8" />
                <MakeTeamPrivateSwitch
                  teamId={team.id}
                  isPrivate={team.isPrivate}
                  disabled={false}
                  isOrg={false}
                />
              </>
            )}
          </div>
          {showMemberInvitationModal && team && (
            <MemberInvitationModal
              isPending={inviteMemberMutation.isPending}
              isOpen={showMemberInvitationModal}
              orgMembers={orgMembersNotInThisTeam}
              teamId={team.id}
              disableCopyLink={true}
              onExit={() => setShowMemberInvitationModal(false)}
              onSubmit={(values, resetFields) => {
                inviteMemberMutation.mutate(
                  {
                    teamId,
                    language: i18n.language,
                    role: values.role,
                    usernameOrEmail: values.emailOrUsername,
                  },
                  {
                    onSuccess: async (data) => {
                      await utils.viewer.teams.get.invalidate();
                      setShowMemberInvitationModal(false);

                      if (Array.isArray(data.usernameOrEmail)) {
                        showToast(
                          t("email_invite_team_bulk", {
                            userCount: data.numUsersInvited,
                          }),
                          "success"
                        );
                        resetFields();
                      } else {
                        showToast(
                          t("email_invite_team", {
                            email: data.usernameOrEmail,
                          }),
                          "success"
                        );
                      }
                    },
                    onError: (error) => {
                      showToast(error.message, "error");
                    },
                  }
                );
              }}
              onSettingsOpen={() => {
                setShowMemberInvitationModal(false);
              }}
            />
          )}
        </>
      )}
    </>
  );
};

export default MembersView;
