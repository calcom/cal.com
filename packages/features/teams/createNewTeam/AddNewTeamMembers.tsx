import { useRouter } from "next/router";
import { Suspense, useState } from "react";

import MemberInvitationModal from "@calcom/features/ee/teams/components/MemberInvitationModal";
import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button, Avatar, Badge } from "@calcom/ui/v2";

import AddNewTeamMemberSkeleton from "./AddNewTeamMemberSkeleton";

// import MemberInvitationModal from "./MemberInvitationModal";

const AddNewTeamMembers = (props: { teamId: number }) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const { data: team, isLoading } = trpc.useQuery(["viewer.teams.get", { teamId: props.teamId }]);
  const removeMemberMutation = trpc.useMutation("viewer.teams.removeMember", {
    onSuccess() {
      utils.invalidateQueries(["viewer.teams.get", { teamId: props.teamId }]);
    },
  });
  console.log("🚀 ~ file: AddNewTeamMembers.tsx ~ line 20 ~ AddNewTeamMembers ~ team", team);

  const [memberInviteModal, setMemberInviteModal] = useState(false);

  if (isLoading) return <AddNewTeamMemberSkeleton />;

  return (
    <Suspense fallback={<AddNewTeamMemberSkeleton />}>
      <>
        <>
          <ul className="rounded-md border">
            {team?.members.map((member, index) => (
              <li
                key={member.id}
                className={classNames(
                  "flex items-center justify-between p-6 text-sm",
                  index !== 0 && "border-t"
                )}>
                <div className="flex space-x-2">
                  <Avatar
                    gravatarFallbackMd5="teamMember"
                    size="mdLg"
                    imageSrc={member?.avatar}
                    alt="owner-avatar"
                  />
                  <div>
                    <div className="flex space-x-1">
                      <p>{member?.name || t("team_member")}</p>
                      {/* Assume that the first member of the team is the creator */}
                      {index === 0 && <Badge variant="green">{t("you")}</Badge>}
                      {!member.accepted && <Badge variant="orange">{t("pending")}</Badge>}
                      {member.role === "MEMBER" && <Badge variant="gray">{t("member")}</Badge>}
                      {member.role === "ADMIN" && <Badge variant="default">{t("admin")}</Badge>}
                    </div>
                    {member.username ? (
                      <p className="text-gray-600">{`${WEBAPP_URL}/${member?.username}`}</p>
                    ) : (
                      <p className="text-gray-600">{t("not_on_cal")}</p>
                    )}
                  </div>
                </div>
                <Button
                  StartIcon={Icon.FiTrash2}
                  size="icon"
                  color="secondary"
                  className="h-[36px] w-[36px]"
                  onClick={() => removeMemberMutation.mutate({ teamId: props.teamId, memberId: member.id })}
                />
              </li>
            ))}
          </ul>

          <Button
            type="submit"
            color="secondary"
            StartIcon={Icon.FiPlus}
            onClick={() => setMemberInviteModal(true)}
            className="mt-6 w-full justify-center">
            {t("add_team_member")}
          </Button>
        </>

        <MemberInvitationModal
          isOpen={memberInviteModal}
          onExit={() => setMemberInviteModal(false)}
          team={team}
          currentMember={team?.membership.role}
        />

        <hr className="my-6  border-neutral-200" />

        <Button
          type="submit"
          EndIcon={Icon.FiArrowRight}
          className="mt-6 w-full justify-center"
          onClick={() => router.push(`${WEBAPP_URL}/settings/teams/${props.teamId}/members`)}>
          {t("finish")}
        </Button>
      </>
    </Suspense>
  );
};

export default AddNewTeamMembers;
