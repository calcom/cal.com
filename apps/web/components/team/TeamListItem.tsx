import { ExternalLinkIcon, TrashIcon, LogoutIcon, PencilIcon } from "@heroicons/react/outline";
import { LinkIcon, DotsHorizontalIcon } from "@heroicons/react/solid";
import Link from "next/link";

import classNames from "@lib/classNames";
import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { trpc, inferQueryOutput } from "@lib/trpc";

import { Dialog, DialogTrigger } from "@components/Dialog";
import { Tooltip } from "@components/Tooltip";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Avatar from "@components/ui/Avatar";
import Button from "@components/ui/Button";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@components/ui/Dropdown";

import { TeamRole } from "./TeamPill";
import { MembershipRole } from ".prisma/client";

interface Props {
  team: inferQueryOutput<"viewer.teams.list">[number];
  key: number;
  onActionSelect: (text: string) => void;
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
          {process.env.NEXT_PUBLIC_APP_URL}/team/{team.slug}
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
          <Link href={"/settings/teams/" + team.id}>
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
              <Button type="button" color="secondary" onClick={declineInvite}>
                {t("reject")}
              </Button>
              <Button type="button" color="primary" className="ltr:ml-2 rtl:mr-2" onClick={acceptInvite}>
                {t("accept")}
              </Button>
            </>
          )}
          {!isInvitee && (
            <div className="flex space-x-2 rtl:space-x-reverse">
              <TeamRole role={team.role} />

              <Tooltip content={t("copy_link_team")}>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(process.env.NEXT_PUBLIC_APP_URL + "/team/" + team.slug);
                    showToast(t("link_copied"), "success");
                  }}
                  className="h-10 w-10 transition-none"
                  size="icon"
                  color="minimal"
                  type="button">
                  <LinkIcon className="h-5 w-5 group-hover:text-gray-600" />
                </Button>
              </Tooltip>
              <Dropdown>
                <DropdownMenuTrigger className="group h-10 w-10 border border-transparent p-0 text-neutral-400 hover:border-gray-200 ">
                  <DotsHorizontalIcon className="h-5 w-5 group-hover:text-gray-800" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {isAdmin && (
                    <DropdownMenuItem>
                      <Link href={"/settings/teams/" + team.id}>
                        <a>
                          <Button
                            type="button"
                            color="minimal"
                            className="w-full font-normal"
                            StartIcon={PencilIcon}>
                            {t("edit_team")}
                          </Button>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && <DropdownMenuSeparator className="h-px bg-gray-200" />}
                  <DropdownMenuItem>
                    <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/team/${team.slug}`} passHref={true}>
                      <a target="_blank">
                        <Button
                          type="button"
                          color="minimal"
                          className="w-full font-normal"
                          StartIcon={ExternalLinkIcon}>
                          {" "}
                          {t("preview_team")}
                        </Button>
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="h-px bg-gray-200" />
                  {isOwner && (
                    <DropdownMenuItem>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            color="warn"
                            StartIcon={TrashIcon}
                            className="w-full font-normal">
                            {t("disband_team")}
                          </Button>
                        </DialogTrigger>
                        <ConfirmationDialogContent
                          variety="danger"
                          title={t("disband_team")}
                          confirmBtnText={t("confirm_disband_team")}
                          onConfirm={() => props.onActionSelect("disband")}>
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
                            color="warn"
                            StartIcon={LogoutIcon}
                            className="w-full"
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
