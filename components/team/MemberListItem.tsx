import { UserRemoveIcon, PencilIcon } from "@heroicons/react/outline";
import { ClockIcon, ExternalLinkIcon, DotsHorizontalIcon } from "@heroicons/react/solid";
import Link from "next/link";
import React, { useState } from "react";

import TeamAvailabilityModal from "@ee/components/team/availability/TeamAvailabilityModal";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { trpc, inferQueryOutput } from "@lib/trpc";

import { Dialog, DialogTrigger } from "@components/Dialog";
import { Tooltip } from "@components/Tooltip";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Avatar from "@components/ui/Avatar";
import Button from "@components/ui/Button";
import ModalContainer from "@components/ui/ModalContainer";

import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/Dropdown";
import MemberChangeRoleModal from "./MemberChangeRoleModal";
import TeamRole from "./TeamRole";
import { MembershipRole } from ".prisma/client";

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
      <div className="flex justify-between my-4">
        <div className="flex flex-col justify-between w-full sm:flex-row">
          <div className="flex">
            <Avatar
              imageSrc={getPlaceholderAvatar(props.member?.avatar, name)}
              alt={name || ""}
              className="rounded-full w-9 h-9"
            />
            <div className="inline-block ml-3">
              <span className="text-sm font-bold text-neutral-700">{name}</span>
              <span className="block -mt-1 text-xs text-gray-400">{props.member.email}</span>
            </div>
          </div>
          <div className="flex mt-2 mr-2 sm:mt-0 sm:justify-center">
            {!props.member.accepted && <TeamRole invitePending />}
            <TeamRole role={props.member.role} />
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
              className="hidden w-10 h-10 p-0 border border-transparent group text-neutral-400 hover:border-gray-200 hover:bg-white sm:block">
              <ClockIcon className="w-5 h-5 group-hover:text-gray-800" />
            </Button>
          </Tooltip>
          <Dropdown>
            <DropdownMenuTrigger className="w-10 h-10 p-0 border border-transparent group text-neutral-400 hover:border-gray-200 hover:bg-white">
              <DotsHorizontalIcon className="w-5 h-5 group-hover:text-gray-800" />
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
              {(props.team.membership.role === MembershipRole.OWNER ||
                props.team.membership.role === MembershipRole.ADMIN) && (
                <>
                  <DropdownMenuItem>
                    <Button
                      onClick={() => setShowChangeMemberRoleModal(true)}
                      color="minimal"
                      StartIcon={PencilIcon}
                      className="flex-shrink-0 w-full font-normal">
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
          teamId={props.team?.id}
          memberId={props.member.id}
          initialRole={props.member.role as MembershipRole}
          onExit={() => setShowChangeMemberRoleModal(false)}
        />
      )}
      {showTeamAvailabilityModal && (
        <ModalContainer wide noPadding>
          <TeamAvailabilityModal team={props.team} member={props.member} />
          <div className="p-5 space-x-2 border-t">
            <Button onClick={() => setShowTeamAvailabilityModal(false)}>{t("done")}</Button>
            {props.team.membership.role !== MembershipRole.MEMBER && (
              <Link href={`/settings/teams/${props.team.id}/availability`}>
                <Button color="secondary">{t("Open Team Availability")}</Button>
              </Link>
            )}
          </div>
        </ModalContainer>
      )}
    </li>
  );
}
