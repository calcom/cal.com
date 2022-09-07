import { MembershipRole } from "@prisma/client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

import TeamAvailabilityModal from "@calcom/features/ee/teams/components/TeamAvailabilityModal";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import {
  Button,
  ButtonGroup,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  showToast,
  Tooltip,
} from "@calcom/ui/v2/core";

import useCurrentUserId from "@lib/hooks/useCurrentUserId";

import MemberChangeRoleModal from "@components/team/MemberChangeRoleModal";
import Avatar from "@components/ui/Avatar";
import ModalContainer from "@components/ui/ModalContainer";

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
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);

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
    <li className="divide-y px-5">
      <div className="my-4 flex justify-between">
        <div className="flex w-full flex-col justify-between sm:flex-row">
          <div className="flex">
            <Avatar
              imageSrc={WEBAPP_URL + "/" + props.member.username + "/avatar.png"}
              alt={name || ""}
              className="h-10 w-10 rounded-full"
            />

            <div className="ml-3 inline-block">
              <div className="mb-1 flex">
                <span className="mr-1 text-sm font-bold leading-4">{name}</span>

                {/* Tooltip doesn't show... WHY????? */}
                {props.member.isMissingSeat && (
                  <Tooltip side="top" content={t("hidden_team_member_message")}>
                    <TeamPill color="red" text={t("hidden")} />
                  </Tooltip>
                )}
                {!props.member.accepted && <TeamPill color="orange" text={t("pending")} />}
                {props.member.role && <TeamRole role={props.member.role} />}
              </div>
              <span
                className="block text-sm text-gray-600"
                data-testid="member-email"
                data-email={props.member.email}>
                {props.member.email}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <ButtonGroup combined containerProps={{ className: "border-gray-300 hidden lg:flex" }}>
            <Tooltip content={t("team_view_user_availability")}>
              <Button
                title={
                  props.member.accepted
                    ? t("team_view_user_availability")
                    : t("team_view_user_availability_disabled")
                }
                disabled={!props.member.accepted}
                onClick={() => (props.member.accepted ? setShowTeamAvailabilityModal(true) : null)}
                color="secondary"
                size="icon"
                StartIcon={Icon.FiClock}
                combined
              />
            </Tooltip>
            <Tooltip content={t("preview")}>
              <Button color="secondary" size="icon" StartIcon={Icon.FiExternalLink} combined />
            </Tooltip>

            <Dropdown>
              <DropdownMenuTrigger className="h-[36px] w-[36px] bg-transparent px-0 py-0 hover:bg-transparent focus:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0">
                <Button
                  color="secondary"
                  size="icon"
                  className="rounded-r-md"
                  StartIcon={Icon.FiMoreHorizontal}
                  combined
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    onClick={() => setShowChangeMemberRoleModal(true)}
                    StartIcon={Icon.FiEdit2}>
                    {t("edit") as string}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <DropdownItem
                    onClick={() => {
                      console.log("delete");
                    }}
                    StartIcon={Icon.FiTrash}
                    className="w-full rounded-none">
                    {t("delete") as string}
                  </DropdownItem>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </Dropdown>
          </ButtonGroup>
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
      {showImpersonateModal && props.member.username && (
        <ModalContainer isOpen={showImpersonateModal} onExit={() => setShowImpersonateModal(false)}>
          <>
            <div className="mb-4 sm:flex sm:items-start">
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                  {t("impersonate")}
                </h3>
              </div>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await signIn("impersonation-auth", {
                  username: props.member.username,
                  teamId: props.team.id,
                });
              }}>
              <p className="mt-2 text-sm text-gray-500" id="email-description">
                {t("impersonate_user_tip")}
              </p>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <Button type="submit" color="primary" className="ltr:ml-2 rtl:mr-2">
                  {t("impersonate")}
                </Button>
                <Button type="button" color="secondary" onClick={() => setShowImpersonateModal(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </>
        </ModalContainer>
      )}
      {showTeamAvailabilityModal && (
        <ModalContainer
          wide
          noPadding
          isOpen={showTeamAvailabilityModal}
          onExit={() => setShowTeamAvailabilityModal(false)}>
          <TeamAvailabilityModal team={props.team} member={props.member} />
          <div className="border-t py-5 rtl:space-x-reverse">
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
