import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import InviteLinkSettingsModal from "@calcom/features/ee/teams/components/InviteLinkSettingsModal";
import MemberInvitationModal from "@calcom/features/ee/teams/components/MemberInvitationModal";
import { classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  UserAvatar,
} from "@calcom/ui";

type TeamMember = RouterOutputs["viewer"]["teams"]["get"]["members"][number];

type FormValues = {
  members: TeamMember[];
};

const AddNewTeamMembers = ({ isOrg = false }: { isOrg?: boolean }) => {
  const searchParams = useCompatSearchParams();
  const session = useSession();
  const telemetry = useTelemetry();

  const teamId = searchParams?.get("id") ? Number(searchParams.get("id")) : -1;
  const teamQuery = trpc.viewer.teams.get.useQuery(
    { teamId, isOrg },
    { enabled: session.status === "authenticated" }
  );

  useEffect(() => {
    const event = searchParams?.get("event");
    if (event === "team_created") {
      telemetry.event(telemetryEventTypes.team_created);
    }
  }, []);

  if (session.status === "loading" || !teamQuery.data) return <AddNewTeamMemberSkeleton />;

  return (
    <AddNewTeamMembersForm
      defaultValues={{ members: teamQuery.data.members }}
      teamId={teamId}
      isOrg={isOrg}
    />
  );
};

export const AddNewTeamMembersForm = ({
  defaultValues,
  teamId,
  isOrg,
}: {
  defaultValues: FormValues;
  teamId: number;
  isOrg?: boolean;
}) => {
  const searchParams = useCompatSearchParams();
  const { t, i18n } = useLocale();

  const router = useRouter();
  const utils = trpc.useUtils();
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

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation();

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
        {defaultValues.members.length > 0 && (
          <ul className="border-subtle rounded-md border" data-testid="pending-member-list">
            {defaultValues.members.map((member, index) => (
              <PendingMemberItem
                key={member.email}
                member={member}
                index={index}
                teamId={teamId}
                isOrg={isOrg}
              />
            ))}
          </ul>
        )}
        <Button
          color="secondary"
          data-testid="new-member-button"
          StartIcon="plus"
          onClick={() => setMemberInviteModal(true)}
          className={classNames("w-full justify-center", defaultValues.members.length > 0 && "mt-6")}>
          {isOrg ? t("add_org_members") : t("add_team_member")}
        </Button>
      </div>
      {isPending ? (
        <SkeletonButton />
      ) : (
        <>
          <MemberInvitationModal
            isPending={inviteMemberMutation.isPending}
            isOpen={memberInviteModal}
            orgMembers={orgMembersNotInThisTeam}
            teamId={teamId}
            token={team?.inviteToken?.token}
            onExit={() => setMemberInviteModal(false)}
            onSubmit={(values, resetFields) => {
              inviteMemberMutation.mutate(
                {
                  teamId,
                  language: i18n.language,
                  role: values.role,
                  usernameOrEmail: values.emailOrUsername,
                  isOrg: !!isOrg,
                },
                {
                  onSuccess: async (data) => {
                    await utils.viewer.teams.get.invalidate();
                    setMemberInviteModal(false);
                    resetFields();
                    if (Array.isArray(data.usernameOrEmail)) {
                      showToast(
                        t("email_invite_team_bulk", {
                          userCount: data.usernameOrEmail.length,
                        }),
                        "success"
                      );
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
              setMemberInviteModal(false);
              setInviteLinkSettingsModal(true);
            }}
            members={defaultValues.members}
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
          let uri = `/settings/teams/${teamId}/profile`;
          if (isOrg) {
            uri = `/settings/organizations/${teamId}/add-teams`;
          }
          router.push(uri);
        }}>
        {isOrg ? t("continue") : t("finish")}
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
  const orgRole = session?.data?.user.org?.role;
  const bookerUrl = member.bookerUrl;
  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.eventTypes.invalidate();
      showToast(t("member_removed"), "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  const isOrgAdminOrOwner = orgRole === MembershipRole.OWNER || orgRole === MembershipRole.ADMIN;

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
      {(member.role !== "OWNER" || isOrgAdminOrOwner) && member.id !== session.data?.user.id && (
        <Button
          data-testid="remove-member-button"
          StartIcon="trash-2"
          variant="icon"
          color="secondary"
          className="h-[36px] w-[36px]"
          onClick={() => {
            removeMemberMutation.mutate({
              teamId: teamId,
              memberId: member.id,
              isOrg: !!props.isOrg,
            });
          }}
        />
      )}
    </li>
  );
};
