import { PencilIcon, UserRemoveIcon } from "@heroicons/react/outline";
import { ClockIcon, DotsHorizontalIcon, ExternalLinkIcon } from "@heroicons/react/solid";
import { MembershipRole } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import Button from "@calcom/ui/Button";
import { Dialog, DialogTrigger } from "@calcom/ui/Dialog";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/Dropdown";
import { Tooltip } from "@calcom/ui/Tooltip";
import TeamAvailabilityModal from "@ee/components/team/availability/TeamAvailabilityModal";

import useCurrentUserId from "@lib/hooks/useCurrentUserId";
import { inferQueryOutput, trpc } from "@lib/trpc";

import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Avatar from "@components/ui/Avatar";
import ModalContainer from "@components/ui/ModalContainer";

import MemberChangeRoleModal from "./MemberChangeRoleModal";
import TeamPill, { TeamRole } from "./TeamPill";

interface Props {
  team: inferQueryOutput<"viewer.teams.get">;
  member: inferQueryOutput<"viewer.teams.get">["members"][number];
}

export default function MemberListItem(props: Props) {
  const { t } = useLocale();

  const utils = trpc.useContext();
  const [showChangeMemberRoleModal, setShowChangeMemberRoleModal] = useState(false);
  const [showTeamAvailabilityModal, setShowTeamAvailabilityModal] = useState(false);

  const removeMemberMutation = trpc.useMutation("viewer.teams.removeMember", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.teams.get"]);
      showToast(t("success"), "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  const ownersInTeam = () => {
    const { members } = props.team;
    const owners = members.filter((member) => member["role"] === MembershipRole.OWNER && member["accepted"]);
    return owners.length;
  };

  const currentUserId = useCurrentUserId();

  const name =
    props.member.name ||
    (() => {
      const emailName = props.member.email.split("@")[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    })();

  const removeMember = () =>
    removeMemberMutation.mutate({ teamId: props.team?.id, memberId: props.member.id });

  return (
    <li className="divide-y">
      <div className="my-4 flex justify-between">
        <div className="flex w-full flex-col justify-between sm:flex-row">
          <div className="flex">
            <Avatar
              imageSrc={WEBAPP_URL + "/" + props.member.username + "/avatar.png"}
              alt={name || ""}
              className="h-9 w-9 rounded-full"
            />
            <div className="ml-3 inline-block">
              <span className="text-sm font-bold text-neutral-700">{name}</span>
              <span
                className="-mt-1 block text-xs text-gray-400"
                data-testid="member-email"
                data-email={props.member.email}>
                {props.member.email}
              </span>
            </div>
          </div>
          <div className="mt-2 flex ltr:mr-2 rtl:ml-2 sm:mt-0 sm:justify-center">
            {/* Tooltip doesn't show... WHY????? */}
            {props.member.isMissingSeat && (
              <Tooltip content={t("hidden_team_member_message")}>
                <TeamPill color="red" text={t("hidden")} />
              </Tooltip>
            )}
            {!props.member.accepted && <TeamPill color="yellow" text={t("invitee")} />}
            {props.member.role && <TeamRole role={props.member.role} />}
          </div>
        </div>
        <div className="flex">
          <Tooltip content={t("team_view_user_availability")}>
            <Button
              // Disabled buttons don't trigger Tooltips
              title={
                props.member.accepted
                  ? t("team_view_user_availability")
                  : t("team_view_user_availability_disabled")
              }
              disabled={!props.member.accepted}
              onClick={() => (props.member.accepted ? setShowTeamAvailabilityModal(true) : null)}
              color="minimal"
              className="group hidden h-10 w-10 items-center justify-center border border-transparent px-0 py-0 text-neutral-400 hover:border-gray-200 hover:bg-white sm:flex">
              <ClockIcon className="h-5 w-5 group-hover:text-gray-800" />
            </Button>
          </Tooltip>
          <Dropdown>
            <DropdownMenuTrigger className="group h-10 w-10 border border-transparent p-0 text-neutral-400 hover:border-gray-200 hover:bg-white">
              <DotsHorizontalIcon className="h-5 w-5 group-hover:text-gray-800" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Link href={"/" + props.member.username}>
                  <a target="_blank">
                    <Button color="minimal" StartIcon={ExternalLinkIcon} className="w-full font-normal">
                      {t("view_public_page")}
                    </Button>
                  </a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="h-px bg-gray-200" />
              {((props.team.membership.role === MembershipRole.OWNER &&
                (props.member.role !== MembershipRole.OWNER ||
                  ownersInTeam() > 1 ||
                  props.member.id !== currentUserId)) ||
                (props.team.membership.role === MembershipRole.ADMIN &&
                  props.member.role !== MembershipRole.OWNER)) && (
                <>
                  <DropdownMenuItem>
                    <Button
                      onClick={() => setShowChangeMemberRoleModal(true)}
                      color="minimal"
                      StartIcon={PencilIcon}
                      className="w-full flex-shrink-0 font-normal">
                      {t("edit_role")}
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="h-px bg-gray-200" />
                  <DropdownMenuItem>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          color="warn"
                          StartIcon={UserRemoveIcon}
                          className="w-full font-normal">
                          {t("remove_member")}
                        </Button>
                      </DialogTrigger>
                      <ConfirmationDialogContent
                        variety="danger"
                        title={t("remove_member")}
                        confirmBtnText={t("confirm_remove_member")}
                        onConfirm={removeMember}>
                        {t("remove_member_confirmation_message")}
                      </ConfirmationDialogContent>
                    </Dialog>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </Dropdown>
        </div>
      </div>
      {showChangeMemberRoleModal && (
        <MemberChangeRoleModal
          isOpen={showChangeMemberRoleModal}
          currentMember={props.team.membership.role}
          teamId={props.team?.id}
          memberId={props.member.id}
          initialRole={props.member.role as MembershipRole}
          onExit={() => setShowChangeMemberRoleModal(false)}
        />
      )}
      {showTeamAvailabilityModal && (
        <ModalContainer
          wide
          noPadding
          isOpen={showTeamAvailabilityModal}
          onExit={() => setShowTeamAvailabilityModal(false)}>
          <TeamAvailabilityModal team={props.team} member={props.member} />
          <div className="space-x-2 border-t py-5 rtl:space-x-reverse">
            <Button onClick={() => setShowTeamAvailabilityModal(false)}>{t("done")}</Button>
            {props.team.membership.role !== MembershipRole.MEMBER && (
              <Link href={`/settings/teams/${props.team.id}/availability`} passHref>
                <Button color="secondary">{t("Open Team Availability")}</Button>
              </Link>
            )}
          </div>
        </ModalContainer>
      )}
    </li>
  );
}
