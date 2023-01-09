import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import { z } from "zod";

import MemberInvitationModal from "@calcom/features/ee/teams/components/MemberInvitationModal";
import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import { Avatar, Badge, Button, Icon, showToast, SkeletonContainer, SkeletonText } from "@calcom/ui";

const querySchema = z.object({
  id: z.string().transform((val) => parseInt(val)),
});

type TeamMember = RouterOutputs["viewer"]["teams"]["get"]["members"][number];

type FormValues = {
  members: TeamMember[];
};

const AddNewTeamMembers = () => {
  const session = useSession();
  const router = useRouter();
  const { id: teamId } = router.isReady ? querySchema.parse(router.query) : { id: -1 };
  const teamQuery = trpc.viewer.teams.get.useQuery({ teamId }, { enabled: router.isReady });
  if (session.status === "loading" || !teamQuery.data) return <AddNewTeamMemberSkeleton />;

  return <AddNewTeamMembersForm defaultValues={{ members: teamQuery.data.members }} teamId={teamId} />;
};

const AddNewTeamMembersForm = ({ defaultValues, teamId }: { defaultValues: FormValues; teamId: number }) => {
  const { t, i18n } = useLocale();
  const [memberInviteModal, setMemberInviteModal] = useState(false);
  const utils = trpc.useContext();
  const router = useRouter();
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      setMemberInviteModal(false);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
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
        <ul className="rounded-md border" data-testid="pending-member-list">
          {defaultValues.members.map((member, index) => (
            <PendingMemberItem key={member.email} member={member} index={index} teamId={teamId} />
          ))}
        </ul>
        <Button
          color="secondary"
          data-testid="new-member-button"
          StartIcon={Icon.FiPlus}
          onClick={() => setMemberInviteModal(true)}
          className="mt-6 w-full justify-center">
          {t("add_team_member")}
        </Button>
      </div>
      <MemberInvitationModal
        isOpen={memberInviteModal}
        onExit={() => setMemberInviteModal(false)}
        onSubmit={(values) => {
          inviteMemberMutation.mutate({
            teamId,
            language: i18n.language,
            role: values.role,
            usernameOrEmail: values.emailOrUsername,
            sendEmailInvitation: values.sendInviteEmail,
          });
        }}
        members={defaultValues.members}
      />
      <hr className="my-6 border-neutral-200" />
      <Button
        EndIcon={Icon.FiArrowRight}
        className="mt-6 w-full justify-center"
        disabled={publishTeamMutation.isLoading}
        onClick={() => {
          publishTeamMutation.mutate({ teamId });
        }}>
        {t("team_publish")}
      </Button>
    </>
  );
};

export default AddNewTeamMembers;

const AddNewTeamMemberSkeleton = () => {
  return (
    <SkeletonContainer className="rounded-md border">
      <div className="flex w-full justify-between p-4">
        <div>
          <p className="text-sm font-medium text-gray-900">
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

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast("Member removed", "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  return (
    <li
      key={member.email}
      className={classNames("flex items-center justify-between p-6 text-sm", index !== 0 && "border-t")}
      data-testid="pending-member-item">
      <div className="flex space-x-2 rtl:space-x-reverse">
        <Avatar
          gravatarFallbackMd5="teamMember"
          size="mdLg"
          imageSrc={WEBAPP_URL + "/" + member.username + "/avatar.png"}
          alt="owner-avatar"
        />
        <div>
          <div className="flex space-x-1">
            <p>{member.name || member.email || t("team_member")}</p>
            {/* Assume that the first member of the team is the creator */}
            {index === 0 && <Badge variant="green">{t("you")}</Badge>}
            {!member.accepted && <Badge variant="orange">{t("pending")}</Badge>}
            {member.role === "MEMBER" && <Badge variant="gray">{t("member")}</Badge>}
            {member.role === "ADMIN" && <Badge variant="default">{t("admin")}</Badge>}
          </div>
          {member.username ? (
            <p className="text-gray-600">{`${WEBAPP_URL}/${member.username}`}</p>
          ) : (
            <p className="text-gray-600">{t("not_on_cal")}</p>
          )}
        </div>
      </div>
      {member.role !== "OWNER" && (
        <Button
          data-testid="remove-member-button"
          StartIcon={Icon.FiTrash2}
          size="icon"
          color="secondary"
          className="h-[36px] w-[36px]"
          onClick={() => {
            removeMemberMutation.mutate({ teamId, memberId: member.id });
          }}
        />
      )}
    </li>
  );
};
