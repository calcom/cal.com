import { MembershipRole } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/router";

import classNames from "@calcom/lib/classNames";
import { getPlaceholderAvatar } from "@calcom/lib/getPlaceholderAvatar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
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
  Icon,
  showToast,
  Tooltip,
} from "@calcom/ui";

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
  const { t } = useLocale();
  const utils = trpc.useContext();
  const team = props.team;

  const acceptOrLeaveMutation = trpc.viewer.teams.acceptOrLeave.useMutation({
    onSuccess: () => {
      utils.viewer.teams.list.invalidate();
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
    <div className="flex px-5 py-5">
      <Avatar
        size="sm"
        imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
        alt="Team Logo"
        className="min-h-9 min-w-9 h-9 w-9 rounded-full"
      />
      <div className="inline-block ltr:ml-3 rtl:mr-3">
        <span className="text-sm font-bold text-gray-700">{team.name}</span>
        <span className="block text-xs text-gray-400">
          {team.slug ? `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/${team.slug}` : "Unpublished team"}
        </span>
      </div>
    </div>
  );

  return (
    <li className="divide-y">
      <div
        className={classNames(
          "flex items-center  justify-between",
          !isInvitee && "group hover:bg-neutral-50"
        )}>
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
              <div className="hidden sm:block">
                <Button type="button" color="secondary" onClick={declineInvite}>
                  {t("reject")}
                </Button>
                <Button
                  type="button"
                  color="primary"
                  className="ltr:ml-2 ltr:mr-2 rtl:ml-2"
                  onClick={acceptInvite}>
                  {t("accept")}
                </Button>
              </div>
              <div className="block sm:hidden">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" color="minimal" size="icon" StartIcon={Icon.FiMoreHorizontal} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Button
                        color="minimal"
                        className="w-full rounded-none font-medium"
                        StartIcon={Icon.FiCheck}
                        onClick={acceptInvite}>
                        {t("accept")}
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Button
                        color="destructive"
                        className="w-full rounded-none font-medium"
                        StartIcon={Icon.FiX}
                        onClick={declineInvite}>
                        {t("reject")}
                      </Button>
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
                      size="icon"
                      StartIcon={Icon.FiLink}
                    />
                  </Tooltip>
                )}
                <Dropdown>
                  <DropdownMenuTrigger asChild className="radix-state-open:rounded-r-md">
                    <Button type="button" color="secondary" size="icon" StartIcon={Icon.FiMoreHorizontal} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent hidden={hideDropdown}>
                    {isAdmin && (
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          href={"/settings/teams/" + team.id + "/profile"}
                          StartIcon={Icon.FiEdit2}>
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
                          StartIcon={Icon.FiExternalLink}>
                          {t("preview_team") as string}
                        </DropdownItem>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="h-px bg-gray-200" />
                    {isOwner && (
                      <DropdownMenuItem>
                        <Dialog open={hideDropdown} onOpenChange={setHideDropdown}>
                          <DialogTrigger asChild>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              color="destructive"
                              className="rounded-none px-3 font-normal"
                              StartIcon={Icon.FiTrash}>
                              {t("disband_team")}
                            </Button>
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
                            <Button
                              type="button"
                              color="destructive"
                              size="lg"
                              StartIcon={Icon.FiLogOut}
                              className="w-full rounded-none"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}>
                              {t("leave_team")}
                            </Button>
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
        StartIcon={Icon.FiGlobe}>
        {t("team_publish")}
      </DropdownItem>
    </DropdownMenuItem>
  );
};
