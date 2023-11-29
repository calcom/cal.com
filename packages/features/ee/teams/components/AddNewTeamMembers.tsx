import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import InviteLinkSettingsModal from "@calcom/features/ee/teams/components/InviteLinkSettingsModal";
import MemberInvitationModal from "@calcom/features/ee/teams/components/MemberInvitationModal";
import { classNames } from "@calcom/lib";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry, telemetryEventTypes } from "@calcom/lib/telemetry";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Badge,
  Button,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";
import { ArrowRight, Plus, Trash2 } from "@calcom/ui/components/icon";

type TeamMember = RouterOutputs["viewer"]["teams"]["get"]["members"][number];

type FormValues = {
  members: TeamMember[];
};

const AddNewTeamMembers = () => {
  const searchParams = useCompatSearchParams();
  const session = useSession();
  const telemetry = useTelemetry();

  const teamId = searchParams?.get("id") ? Number(searchParams.get("id")) : -1;
  const teamQuery = trpc.viewer.teams.get.useQuery(
    { teamId },
    { enabled: session.status === "authenticated" }
  );

  useEffect(() => {
    const event = searchParams?.get("event");
    if (event === "team_created") {
      telemetry.event(telemetryEventTypes.team_created);
    }
  }, []);

  if (session.status === "loading" || !teamQuery.data) return <AddNewTeamMemberSkeleton />;

  return <AddNewTeamMembersForm defaultValues={{ members: teamQuery.data.members }} teamId={teamId} />;
};

export const AddNewTeamMembersForm = ({
  defaultValues,
  teamId,
}: {
  defaultValues: FormValues;
  teamId: number;
}) => {
  const searchParams = useCompatSearchParams();
  const { t, i18n } = useLocale();

  const router = useRouter();
  const utils = trpc.useContext();
  const orgBranding = useOrgBranding();

  const showDialog = searchParams?.get("inviteModal") === "true";
  const [memberInviteModal, setMemberInviteModal] = useState(showDialog);
  const [inviteLinkSettingsModal, setInviteLinkSettingsModal] = useState(false);

  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery({ teamId }, { enabled: !!teamId });
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
              <PendingMemberItem key={member.email} member={member} index={index} teamId={teamId} />
            ))}
          </ul>
        )}
        <Button
          color="secondary"
          data-testid="new-member-button"
          StartIcon={Plus}
          onClick={() => setMemberInviteModal(true)}
          className={classNames("w-full justify-center", defaultValues.members.length > 0 && "mt-6")}>
          {t("add_team_member")}
        </Button>
      </div>
      {isLoading ? (
        <SkeletonButton />
      ) : (
        <>
          <MemberInvitationModal
            isLoading={inviteMemberMutation.isLoading}
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
                },
                {
                  onSuccess: async (data) => {
                    await utils.viewer.teams.get.invalidate();
                    setMemberInviteModal(false);
                    if (Array.isArray(data.usernameOrEmail)) {
                      showToast(
                        t("email_invite_team_bulk", {
                          userCount: data.usernameOrEmail.length,
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
        EndIcon={!orgBranding ? ArrowRight : undefined}
        color="primary"
        className="w-full justify-center"
        disabled={publishTeamMutation.isLoading}
        onClick={() => {
          router.push(`/settings/teams/${teamId}/profile`);
        }}>
        {t("finish")}
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

const PendingMemberItem = (props: { member: TeamMember; index: number; teamId: number }) => {
  const { member, index, teamId } = props;
  const { t } = useLocale();
  const utils = trpc.useContext();
  const session = useSession();
  const bookerUrl = useBookerUrl();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    enabled: !!session.data?.user?.org,
  });
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

  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  return (
    <li
      key={member.email}
      className={classNames(
        "flex items-center justify-between p-6 text-sm",
        index !== 0 && "border-subtle border-t"
      )}
      data-testid="pending-member-item">
      <div className="mr-4 flex max-w-full space-x-2 overflow-hidden rtl:space-x-reverse">
        <Avatar size="mdLg" imageSrc={`${bookerUrl}/${member.username}/avatar.png`} alt="owner-avatar" />
        <div className="max-w-full overflow-hidden">
          <div className="flex space-x-1">
            <p>{member.name || member.email || t("team_member")}</p>
            {/* Assume that the first member of the team is the creator */}
            {member.id === session.data?.user.id && <Badge variant="green">{t("you")}</Badge>}
            {!member.accepted && <Badge variant="orange">{t("pending")}</Badge>}
            {member.role === "MEMBER" && <Badge variant="gray">{t("member")}</Badge>}
            {member.role === "ADMIN" && <Badge variant="default">{t("admin")}</Badge>}
          </div>
          {member.username ? (
            <p className="text-default truncate">{`${WEBAPP_URL}/${member.username}`}</p>
          ) : (
            <p className="text-default truncate">{t("not_on_cal", { appName: APP_NAME })}</p>
          )}
        </div>
      </div>
      {(member.role !== "OWNER" || isOrgAdminOrOwner) && (
        <Button
          data-testid="remove-member-button"
          StartIcon={Trash2}
          variant="icon"
          color="secondary"
          className="h-[36px] w-[36px]"
          onClick={() => {
            removeMemberMutation.mutate({
              teamId: teamId,
              memberId: member.id,
            });
          }}
        />
      )}
    </li>
  );
};
