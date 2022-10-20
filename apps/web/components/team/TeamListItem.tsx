import { MembershipRole } from "@prisma/client";
import Link from "next/link";

import classNames from "@calcom/lib/classNames";
import { getPlaceholderAvatar } from "@calcom/lib/getPlaceholderAvatar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import Button from "@calcom/ui/v2/core/Button";
import ButtonGroup from "@calcom/ui/v2/core/ButtonGroup";
import ConfirmationDialogContent from "@calcom/ui/v2/core/ConfirmationDialogContent";
import { Dialog, DialogTrigger } from "@calcom/ui/v2/core/Dialog";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownItem,
} from "@calcom/ui/v2/core/Dropdown";
import { Tooltip } from "@calcom/ui/v2/core/Tooltip";
import showToast from "@calcom/ui/v2/core/notifications";

import Avatar from "@components/ui/Avatar";

import { TeamRole } from "./TeamPill";

interface Props {
  team: inferQueryOutput<"viewer.teams.list">[number];
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
      utils.invalidateQueries(["viewer.teams.list"]);
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
        size={9}
        imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
        alt="Team Logo"
        className="min-h-9 min-w-9 h-9 w-9 rounded-full"
      />
      <div className="ml-3 inline-block">
        <span className="text-sm font-bold text-neutral-700">{team.name}</span>
        <span className="block text-xs text-gray-400">
          {process.env.NEXT_PUBLIC_WEBSITE_URL}/team/{team.slug}
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
          <Link href={"/settings/teams/" + team.id + "/profile"}>
            <a className="flex-grow cursor-pointer truncate text-sm" title={`${team.name}`}>
              {teamInfo}
            </a>
          </Link>
        ) : (
          teamInfo
        )}
        <div className="px-5 py-5">
          {isInvitee && (
            <>
              <div className="hidden sm:block">
                <Button type="button" color="secondary" onClick={declineInvite}>
                  {t("reject")}
                </Button>
                <Button type="button" color="primary" className="ltr:ml-2 rtl:mr-2" onClick={acceptInvite}>
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
          )}
          {!isInvitee && (
            <div className="flex space-x-2 rtl:space-x-reverse">
              <TeamRole role={team.role} />
              <ButtonGroup combined>
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
                    combined
                  />
                </Tooltip>
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
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        target="_blank"
                        href={`${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/${team.slug}`}
                        StartIcon={Icon.FiExternalLink}>
                        {t("preview_team") as string}
                      </DropdownItem>
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
