"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState, useMemo } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { UserAvatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import InviteLinkSettingsModal from "@calcom/web/modules/ee/teams/components/InviteLinkSettingsModal";

import { MemberInvitationModalWithoutMembers } from "~/ee/teams/components/MemberInvitationModal";

type TeamMember = RouterOutputs["viewer"]["teams"]["listMembers"]["members"][number];

const AddNewTeamMembers = ({ isOrg = false }: { isOrg?: boolean }) => {
  const searchParams = useCompatSearchParams();
  const session = useSession();

  const teamId = searchParams?.get("id") ? Number(searchParams.get("id")) : -1;
  const teamQuery = trpc.viewer.teams.get.useQuery(
    { teamId, isOrg },
    { enabled: session.status === "authenticated" }
  );

  if (session.status === "loading" || !teamQuery.data) return <AddNewTeamMemberSkeleton />;

  return <AddNewTeamMembersForm teamId={teamId} isOrg={isOrg} />;
};

export const AddNewTeamMembersForm = ({ teamId, isOrg }: { teamId: number; isOrg?: boolean }) => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();

  const router = useRouter();
  const orgBranding = useOrgBranding();

  const showDialog = searchParams?.get("inviteModal") === "true";
  const [memberInviteModal, setMemberInviteModal] = useState(showDialog);
  const [inviteLinkSettingsModal, setInviteLinkSettingsModal] = useState(false);

  const { data: team, isPending } = trpc.viewer.teams.get.useQuery({ teamId, isOrg }, { enabled: !!teamId });
  const { data: orgMembersNotInThisTeam } = trpc.viewer.organizations.getMembers.useQuery(
    {
      teamIdToExclude: teamId,
      distinctUser: true,
    },
    {
      enabled: orgBranding !== null,
    }
  );

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } =
    trpc.viewer.teams.listMembers.useInfiniteQuery(
      {
        limit: 10,
        teamId,
      },
      {
        enabled: !!teamId,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        staleTime: 0,
      }
    );

  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.members) ?? [], [data]) as TeamMember[];
  const totalFetched = flatData.length;

  const publishTeamMutation = trpc.viewer.teams.publish.useMutation({
    onSuccess(data) {
      router.push(data.url);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <>
      <div>
        <ul className="border-subtle rounded-md border" data-testid="pending-member-list">
          {flatData.map((member, index) => (
            <PendingMemberItem
              key={member.email}
              member={member}
              index={index}
              teamId={teamId}
              isOrg={isOrg}
            />
          ))}
        </ul>
        {totalFetched > 0 && (
          <div className="text-default text-center">
            <Button
              color="minimal"
              loading={isFetchingNextPage}
              disabled={!hasNextPage}
              onClick={() => fetchNextPage()}>
              {hasNextPage ? t("load_more_results") : t("no_more_results")}
            </Button>
          </div>
        )}
        <Button
          color="secondary"
          data-testid="new-member-button"
          StartIcon="plus"
          onClick={() => setMemberInviteModal(true)}
          className={classNames("w-full justify-center", totalFetched > 0 && "mt-6")}>
          {isOrg ? t("add_org_members") : t("add_team_member")}
        </Button>
      </div>
      {isPending ? (
        <SkeletonButton />
      ) : (
        <>
          <MemberInvitationModalWithoutMembers
            showMemberInvitationModal={memberInviteModal}
            orgMembers={orgMembersNotInThisTeam}
            teamId={teamId}
            token={team?.inviteToken?.token}
            hideInvitationModal={() => setMemberInviteModal(false)}
            onSettingsOpen={() => {
              setMemberInviteModal(false);
              setInviteLinkSettingsModal(true);
            }}
          />
          {team?.inviteToken && (
            <InviteLinkSettingsModal
              isOpen={inviteLinkSettingsModal}
              teamId={team.id}
              token={team.inviteToken?.token}
              expiresInDays={team.inviteToken?.expiresInDays || undefined}
              onExit={() => {
                setInviteLinkSettingsModal(false);
                setMemberInviteModal(true);
              }}
            />
          )}
        </>
      )}
      <hr className="border-subtle my-6" />
      <Button
        data-testid="publish-button"
        EndIcon={!orgBranding || isOrg ? "arrow-right" : undefined}
        color="primary"
        className="w-full justify-center"
        disabled={publishTeamMutation.isPending}
        onClick={() => {
          posthog.capture("onboard_members_continue_clicked", {
            team_id: teamId,
            is_org: isOrg,
            members_count: totalFetched,
          });
          let uri = `/settings/teams/${teamId}/event-type`;
          if (isOrg) {
            uri = `/settings/organizations/${teamId}/add-teams`;
          }
          router.push(uri);
        }}>
        {t("continue")}
      </Button>
    </>
  );
};

export default AddNewTeamMembers;

const AddNewTeamMemberSkeleton = () => {
  return (
    <SkeletonContainer className="border-subtle rounded-md border">
      <div className="flex w-full justify-between p-4">
        <div>
          <p className="text-emphasis text-sm font-medium">
            <SkeletonText className="h-4 w-56" />
          </p>
          <div className="mt-2.5 w-max">
            <SkeletonText className="h-5 w-28" />
          </div>
        </div>
      </div>
    </SkeletonContainer>
  );
};

const PendingMemberItem = (props: { member: TeamMember; index: number; teamId: number; isOrg?: boolean }) => {
  const { member, index, teamId } = props;
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const session = useSession();
  const isAdminOrOwner = checkAdminOrOwner(session.data?.user?.org?.role);
  const bookerUrl = member.bookerUrl;
  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.teams.listMembers.invalidate();
      await utils.viewer.eventTypes.invalidate();
      showToast(t("member_removed"), "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  return (
    <li
      key={member.email}
      className={classNames(
        "flex items-center justify-between p-6 text-sm",
        index !== 0 && "border-subtle border-t"
      )}
      data-testid="pending-member-item">
      <div className="mr-4 flex max-w-full space-x-2 overflow-hidden rtl:space-x-reverse">
        <UserAvatar size="mdLg" user={member} />
        <div className="max-w-full overflow-hidden">
          <div className="flex space-x-1">
            <p>{member.name || member.email || t("team_member")}</p>
            {/* Assume that the first member of the team is the creator */}
            {member.id === session.data?.user.id && <Badge variant="green">{t("you")}</Badge>}
            {!member.accepted && <Badge variant="orange">{t("pending")}</Badge>}
            {member.role === MembershipRole.MEMBER && <Badge variant="gray">{t("member")}</Badge>}

            {member.role === MembershipRole.ADMIN && <Badge variant="gray">{t("admin")}</Badge>}
            {member.role === MembershipRole.OWNER && <Badge variant="gray">{t("owner")}</Badge>}
          </div>
          {member.username ? (
            <p className="text-default truncate">{`${bookerUrl}/${member.username}`}</p>
          ) : (
            <p className="text-default truncate">{t("not_on_cal", { appName: APP_NAME })}</p>
          )}
        </div>
      </div>
      {(member.role !== "OWNER" || isAdminOrOwner) && member.id !== session.data?.user.id && (
        <Button
          data-testid="remove-member-button"
          StartIcon="trash-2"
          variant="icon"
          color="secondary"
          className="h-[36px] w-[36px]"
          onClick={() => {
            removeMemberMutation.mutate({
              teamIds: [teamId],
              memberIds: [member.id],
              isOrg: !!props.isOrg,
            });
          }}
        />
      )}
    </li>
  );
};
