"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button, Meta, showToast, TextField } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import DisableTeamImpersonation from "../components/DisableTeamImpersonation";
import InviteLinkSettingsModal from "../components/InviteLinkSettingsModal";
import MakeTeamPrivateSwitch from "../components/MakeTeamPrivateSwitch";
import MemberInvitationModal from "../components/MemberInvitationModal";
import MemberListItem from "../components/MemberListItem";
import TeamInviteList from "../components/TeamInviteList";

type Team = RouterOutputs["viewer"]["teams"]["get"];

interface MembersListProps {
  team: Team | undefined;
  isOrgAdminOrOwner: boolean | undefined;
}

const checkIfExist = (comp: string, query: string) =>
  comp.toLowerCase().replace(/\s+/g, "").includes(query.toLowerCase().replace(/\s+/g, ""));

function MembersList(props: MembersListProps) {
  const { team, isOrgAdminOrOwner } = props;
  const { t } = useLocale();
  const [query, setQuery] = useState<string>("");

  const members = team?.members;
  const membersList = members
    ? members && query === ""
      ? members
      : members.filter((member) => {
          const email = member.email ? checkIfExist(member.email, query) : false;
          const username = member.username ? checkIfExist(member.username, query) : false;
          const name = member.name ? checkIfExist(member.name, query) : false;

          return email || username || name;
        })
    : undefined;
  return (
    <div className="flex flex-col gap-y-3">
      <TextField
        type="search"
        autoComplete="false"
        onChange={(e) => setQuery(e.target.value)}
        value={query}
        placeholder={`${t("search")}...`}
      />
      {membersList?.length && team ? (
        <ul
          className="divide-subtle border-subtle divide-y rounded-md border "
          data-testId="team-member-list-container">
          {membersList.map((member) => {
            return (
              <MemberListItem
                key={member.id}
                team={team}
                member={member}
                isOrgAdminOrOwner={isOrgAdminOrOwner}
              />
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function _MembersList(props: MembersListProps) {
  const { team, isOrgAdminOrOwner } = props;
  const { t } = useLocale();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const { data, isPending, fetchNextPage, isFetching } = trpc.viewer.teams.lazyLoadMembers.useInfiniteQuery(
    {
      limit: 10,
      searchTerm: debouncedSearchTerm,
      teamId: team.id,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
    }
  );

  return <div>MembersList</div>;
}

const MembersView = () => {
  const searchParams = useCompatSearchParams();
  const { t, i18n } = useLocale();

  const router = useRouter();
  const session = useSession();
  const org = session?.data?.user.org;

  const utils = trpc.useUtils();
  const params = useParamsWithFallback();

  const teamId = Number(params.id);

  const showDialog = searchParams?.get("inviteModal") === "true";
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(showDialog);
  const [showInviteLinkSettingsModal, setInviteLinkSettingsModal] = useState(false);

  const { data: orgMembersNotInThisTeam, isPending: isOrgListLoading } =
    trpc.viewer.organizations.getMembers.useQuery(
      {
        teamIdToExclude: teamId,
        distinctUser: true,
      },
      {
        enabled: searchParams !== null && !!teamId,
      }
    );

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

  const {
    data: _team,
    isPending: _isTeamsLoading,
    error: _teamError,
  } = trpc.viewer.teams.getTeamWithMinimalData.useQuery(
    { teamId },
    {
      enabled: !!teamId,
    }
  );

  console.log("_team", _team);

  useEffect(
    function refactorMeWithoutEffect() {
      if (teamError) {
        router.replace("/teams");
      }
    },
    [teamError]
  );

  const isPending = isOrgListLoading || isTeamsLoading;

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation();

  const isInviteOpen = !_team?.membership.accepted;

  const isAdmin =
    _team &&
    (_team.membership.role === MembershipRole.OWNER || _team.membership.role === MembershipRole.ADMIN);

  const isOrgAdminOrOwner = org?.role === MembershipRole.OWNER || org?.role === MembershipRole.ADMIN;
  console.log("team", team);

  return (
    <>
      <Meta
        title={t("team_members")}
        description={t("members_team_description")}
        CTA={
          isAdmin || isOrgAdminOrOwner ? (
            <Button
              type="button"
              color="primary"
              StartIcon="plus"
              className="ml-auto"
              onClick={() => setShowMemberInvitationModal(true)}
              data-testid="new-member-button">
              {t("add")}
            </Button>
          ) : (
            <></>
          )
        }
      />
      {!isPending && (
        <>
          <div>
            {_team && (
              <>
                {isInviteOpen && (
                  <TeamInviteList
                    teams={[
                      {
                        id: _team.id,
                        accepted: _team.membership.accepted || false,
                        name: _team.name,
                        slug: _team.slug,
                        role: _team.membership.role,
                      },
                    ]}
                  />
                )}
              </>
            )}

            {((_team?.isPrivate && isAdmin) || !_team?.isPrivate || isOrgAdminOrOwner) && (
              <>
                <MembersList team={team} isOrgAdminOrOwner={isOrgAdminOrOwner} />
              </>
            )}

            {_team && session.data && (
              <DisableTeamImpersonation
                teamId={_team.id}
                memberId={session.data.user.id}
                disabled={isInviteOpen}
              />
            )}

            {_team && (isAdmin || isOrgAdminOrOwner) && (
              <MakeTeamPrivateSwitch
                isOrg={false}
                teamId={_team.id}
                isPrivate={_team.isPrivate}
                disabled={isInviteOpen}
              />
            )}
          </div>
          {showMemberInvitationModal && team && (
            <MemberInvitationModal
              isPending={inviteMemberMutation.isPending}
              isOpen={showMemberInvitationModal}
              orgMembers={orgMembersNotInThisTeam}
              members={team.members}
              teamId={_team.id}
              token={_team.inviteToken?.token}
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
                      await utils.viewer.organizations.getMembers.invalidate();
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
                setInviteLinkSettingsModal(true);
              }}
            />
          )}
          {showInviteLinkSettingsModal && _team?.inviteToken && (
            <InviteLinkSettingsModal
              isOpen={showInviteLinkSettingsModal}
              teamId={_team.id}
              token={_team.inviteToken.token}
              expiresInDays={_team.inviteToken.expiresInDays || undefined}
              onExit={() => {
                setInviteLinkSettingsModal(false);
                setShowMemberInvitationModal(true);
              }}
            />
          )}
        </>
      )}
    </>
  );
};

MembersView.getLayout = getLayout;

export default MembersView;
