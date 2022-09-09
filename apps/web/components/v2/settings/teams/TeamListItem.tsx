import { MembershipRole } from "@prisma/client";
import Link from "next/link";

import classNames from "@calcom/lib/classNames";
import { getPlaceholderAvatar } from "@calcom/lib/getPlaceholderAvatar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import {
  Avatar,
  Button,
  Dialog,
  DialogTrigger,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  showToast,
  Tooltip,
} from "@calcom/ui/v2";
import ConfirmationDialogContent from "@calcom/ui/v2/core/ConfirmationDialogContent";

import { TeamRole } from "./TeamPill";

interface Props {
  team: {
    id?: number;
    name?: string | null;
    slug?: string | null;
    logo?: string | null;
    bio?: string | null;
    hideBranding?: boolean | undefined;
    role: MembershipRole;
    accepted: boolean;
  };
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

  const acceptOrLeaveMutation = trpc.useMutation("viewer.teams.acceptOrLeave", {
    onSuccess: () => {
      utils.invalidateQueries(["viewer.teams.get"]);
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
    <div className="flex">
      <Avatar
        size="mdLg"
        imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
        alt="Team Logo"
        className=""
      />
      <div className="ml-3 inline-block">
        <span className="text-sm font-semibold text-black">{team.name}</span>
        <span className="block text-sm leading-5 text-gray-700">
          {t("invited_by_team", { teamName: team.name, role: t(team.role.toLocaleLowerCase()) })}
        </span>
      </div>
    </div>
  );

  return (
    <li className="divide-y rounded-md border border-gray-400 bg-gray-100 px-5 py-4">
      <div
        className={classNames(
          "flex items-center  justify-between",
          !isInvitee && "group hover:bg-neutral-50"
        )}>
        {!isInvitee ? (
          <Link href={"/settings/teams/" + team.id}>
            <a className="flex-grow cursor-pointer truncate text-sm" title={`${team.name}`}>
              {teamInfo}
            </a>
          </Link>
        ) : (
          teamInfo
        )}
        <div className="">
          {isInvitee && (
            <>
              <div className="hidden sm:flex">
                <Button
                  type="button"
                  className="mr-3 border-gray-700"
                  size="icon"
                  color="secondary"
                  onClick={declineInvite}
                  StartIcon={Icon.FiSlash}
                />
                <Button
                  type="button"
                  className="border-gray-700"
                  size="icon"
                  color="secondary"
                  onClick={acceptInvite}
                  StartIcon={Icon.FiCheck}
                />
              </div>
              <div className="block sm:hidden">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" color="minimal" size="icon" StartIcon={Icon.FiMoreHorizontal} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Button
                        color="destructive"
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
          )}
          {!isInvitee && (
            <div className="flex space-x-2 rtl:space-x-reverse">
              <TeamRole role={team.role} />

              <Tooltip side="top" content={t("copy_link_team")}>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(process.env.NEXT_PUBLIC_WEBSITE_URL + "/team/" + team.slug);
                    showToast(t("link_copied"), "success");
                  }}
                  className="h-10 w-10 transition-none"
                  size="icon"
                  color="minimal"
                  type="button">
                  <Icon.FiLink className="h-5 w-5 group-hover:text-gray-600" />
                </Button>
              </Tooltip>
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button type="button" color="minimal" size="icon" StartIcon={Icon.FiMoreHorizontal} />
                </DropdownMenuTrigger>
                <DropdownMenuContent hidden={hideDropdown}>
                  {isAdmin && (
                    <DropdownMenuItem>
                      <Link href={"/settings/teams/" + team.id}>
                        <a>
                          <Button
                            color="minimal"
                            className="w-full rounded-none font-medium"
                            StartIcon={Icon.FiEdit2}>
                            {t("edit_team")}
                          </Button>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Link href={`${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/${team.slug}`} passHref={true}>
                      <a target="_blank">
                        <Button
                          color="minimal"
                          className="w-full rounded-none font-medium"
                          StartIcon={Icon.FiExternalLink}>
                          {t("preview_team")}
                        </Button>
                      </a>
                    </Link>
                  </DropdownMenuItem>
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
                            className="w-full rounded-none font-medium"
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
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
