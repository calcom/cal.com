import { MembershipRole } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import MemberInvitationModal from "@calcom/ee/teams/components/MemberInvitationModal";
import classNames from "@calcom/lib/classNames";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Button,
  ButtonGroup,
  ConfirmationDialogContent,
  Dialog,
  DialogTrigger,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  showToast,
  Tooltip,
} from "@calcom/ui";
import {
  MoreHorizontal,
  Check,
  X,
  Link as LinkIcon,
  Edit2,
  ExternalLink,
  Trash,
  LogOut,
  Globe,
  Send,
} from "@calcom/ui/components/icon";

import { TeamRole } from "./TeamPill";

interface Props {
  team: RouterOutputs["viewer"]["teams"]["list"][number];
  key: number;
  onActionSelect: (text: string) => void;
  isLoading?: boolean;
  hideDropdown: boolean;
  setHideDropdown: (value: boolean) => void;
}

export default function TeamListItem(props: Props) {
  const { t, i18n } = useLocale();
  const utils = trpc.useContext();
  const team = props.team;
  const [openMemberInvitationModal, setOpenMemberInvitationModal] = useState(false);
  const teamQuery = trpc.viewer.teams.get.useQuery({ teamId: team?.id });
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    async onSuccess(data) {
      await utils.viewer.teams.get.invalidate();
      setOpenMemberInvitationModal(false);
      if (data.sendEmailInvitation) {
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
  });

  const acceptOrLeaveMutation = trpc.viewer.teams.acceptOrLeave.useMutation({
    onSuccess: () => {
      utils.viewer.teams.list.invalidate();
      utils.viewer.teams.listInvites.invalidate();
    },
  });

  function acceptOrLeave(accept: boolean) {
    acceptOrLeaveMutation.mutate({
      teamId: team?.id as number,
      accept,
    });
  }

  const acceptInvite = () => acceptOrLeave(true);
  const declineInvite = () => acceptOrLeave(false);

  const isOwner = props.team.role === MembershipRole.OWNER;
  const isInvitee = !props.team.accepted;
  const isAdmin = props.team.role === MembershipRole.OWNER || props.team.role === MembershipRole.ADMIN;
  const { hideDropdown, setHideDropdown } = props;

  if (!team) return <></>;

  const teamInfo = (
    <div className="item-center flex px-5 py-5">
      <Avatar
        size="md"
        imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
        alt="Team Logo"
        className="inline-flex justify-center"
      />
      <div className="ms-3 inline-block truncate">
        <span className="text-default text-sm font-bold">{team.name}</span>
        <span className="text-muted block text-xs">
          {team.slug ? `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/${team.slug}` : "Unpublished team"}
        </span>
      </div>
    </div>
  );

  return (
    <li className="">
      <MemberInvitationModal
        isOpen={openMemberInvitationModal}
        onExit={() => {
          setOpenMemberInvitationModal(false);
        }}
        onSubmit={(values) => {
          inviteMemberMutation.mutate({
            teamId: team.id,
            language: i18n.language,
            role: values.role,
            usernameOrEmail: values.emailOrUsername,
            sendEmailInvitation: values.sendInviteEmail,
          });
        }}
        members={teamQuery?.data?.members || []}
      />
      <div className={classNames("flex items-center  justify-between", !isInvitee && "hover:bg-muted group")}>
        {!isInvitee ? (
          <Link
            href={"/settings/teams/" + team.id + "/profile"}
            className="flex-grow cursor-pointer truncate text-sm"
            title={`${team.name}`}>
            {teamInfo}
          </Link>
        ) : (
          teamInfo
        )}
        <div className="px-5 py-5">
          {isInvitee ? (
            <>
              <div className="hidden justify-center sm:flex">
                <Button type="button" color="secondary" onClick={declineInvite}>
                  {t("reject")}
                </Button>
                <Button
                  type="button"
                  color="secondary"
                  data-testid={`accept-invitation-${team.id}`}
                  StartIcon={Check}
                  className="ms-2 me-2"
                  onClick={acceptInvite}>
                  {t("accept")}
                </Button>
              </div>
              <div className="block sm:hidden">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" color="minimal" variant="icon" StartIcon={MoreHorizontal} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <DropdownItem type="button" StartIcon={Check} onClick={acceptInvite}>
                        {t("accept")}
                      </DropdownItem>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <DropdownItem color="destructive" type="button" StartIcon={X} onClick={declineInvite}>
                        {t("reject")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </Dropdown>
              </div>
            </>
          ) : (
            <div className="flex space-x-2 rtl:space-x-reverse">
              <TeamRole role={team.role} />
              <ButtonGroup combined>
                {team.slug && (
                  <Tooltip content={t("copy_link_team")}>
                    <Button
                      color="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          process.env.NEXT_PUBLIC_WEBSITE_URL + "/team/" + team.slug
                        );
                        showToast(t("link_copied"), "success");
                      }}
                      variant="icon"
                      StartIcon={LinkIcon}
                    />
                  </Tooltip>
                )}
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="radix-state-open:rounded-r-md"
                      type="button"
                      color="secondary"
                      variant="icon"
                      StartIcon={MoreHorizontal}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent hidden={hideDropdown}>
                    {isAdmin && (
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          href={"/settings/teams/" + team.id + "/profile"}
                          StartIcon={Edit2}>
                          {t("edit_team") as string}
                        </DropdownItem>
                      </DropdownMenuItem>
                    )}
                    {!team.slug && <TeamPublishButton teamId={team.id} />}
                    {team.slug && (
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          target="_blank"
                          href={`${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/${team.slug}`}
                          StartIcon={ExternalLink}>
                          {t("preview_team") as string}
                        </DropdownItem>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        onClick={() => {
                          setOpenMemberInvitationModal(true);
                        }}
                        StartIcon={Send}>
                        {t("invite_team_member") as string}
                      </DropdownItem>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isOwner && (
                      <DropdownMenuItem>
                        <Dialog open={hideDropdown} onOpenChange={setHideDropdown}>
                          <DialogTrigger asChild>
                            <DropdownItem
                              color="destructive"
                              type="button"
                              StartIcon={Trash}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}>
                              {t("disband_team")}
                            </DropdownItem>
                          </DialogTrigger>
                          <ConfirmationDialogContent
                            variety="danger"
                            title={t("disband_team")}
                            confirmBtnText={t("confirm_disband_team")}
                            isLoading={props.isLoading}
                            onConfirm={() => {
                              props.onActionSelect("disband");
                            }}>
                            {t("disband_team_confirmation_message")}
                          </ConfirmationDialogContent>
                        </Dialog>
                      </DropdownMenuItem>
                    )}

                    {!isOwner && (
                      <DropdownMenuItem>
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownItem
                              color="destructive"
                              type="button"
                              StartIcon={LogOut}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}>
                              {t("leave_team")}
                            </DropdownItem>
                          </DialogTrigger>
                          <ConfirmationDialogContent
                            variety="danger"
                            title={t("leave_team")}
                            confirmBtnText={t("confirm_leave_team")}
                            onConfirm={declineInvite}>
                            {t("leave_team_confirmation_message")}
                          </ConfirmationDialogContent>
                        </Dialog>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </Dropdown>
              </ButtonGroup>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

const TeamPublishButton = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const router = useRouter();
  const publishTeamMutation = trpc.viewer.teams.publish.useMutation({
    onSuccess(data) {
      router.push(data.url);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <DropdownMenuItem>
      <DropdownItem
        type="button"
        onClick={() => {
          publishTeamMutation.mutate({ teamId });
        }}
        StartIcon={Globe}>
        {t("team_publish")}
      </DropdownItem>
    </DropdownMenuItem>
  );
};
