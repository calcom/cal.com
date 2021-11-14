import {
  DotsHorizontalIcon,
  ExternalLinkIcon,
  LinkIcon,
  PencilAltIcon,
  TrashIcon,
} from "@heroicons/react/outline";
import Link from "next/link";
import { useState } from "react";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { Team } from "@lib/types/team";

import { Dialog, DialogTrigger } from "@components/Dialog";
import { Tooltip } from "@components/Tooltip";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Avatar from "@components/ui/Avatar";
import Button from "@components/ui/Button";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/Dropdown";

export default function TeamListItem(props: {
  onChange: () => void;
  key: number;
  team: Team;
  onActionSelect: (text: string) => void;
}) {
  const [team, setTeam] = useState<Team | null>(props.team);
  const { t } = useLocale();

  const acceptInvite = () => invitationResponse(true);
  const declineInvite = () => invitationResponse(false);

  const invitationResponse = (accept: boolean) =>
    fetch("/api/user/membership", {
      method: accept ? "PATCH" : "DELETE",
      body: JSON.stringify({ teamId: props.team.id }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(() => {
      // success
      setTeam(null);
      props.onChange();
    });

  return (
    team && (
      <li className="divide-y">
        <div
          className={classNames(
            "flex justify-between py-5 px-5 items-center",
            props.team.role !== "INVITEE" && "group hover:bg-neutral-50"
          )}>
          <Link href={"/settings/teams/" + props.team.id}>
            <a className="flex-grow text-sm truncate cursor-pointer" title={`${props.team.name}`}>
              <div className="flex">
                <Avatar
                  size={9}
                  imageSrc={
                    props.team.logo
                      ? props.team.logo
                      : "https://eu.ui-avatars.com/api/?background=fff&color=f9f9f9&bold=true&background=000000&name=" +
                        encodeURIComponent(props.team.name || "")
                  }
                  alt="Team Logo"
                  className="rounded-full w-9 h-9"
                />
                <div className="inline-block ml-3">
                  <span className="text-sm font-bold text-neutral-700">{props.team.name}</span>
                  <span className="block text-xs text-gray-400">
                    {process.env.NEXT_PUBLIC_APP_URL}/team/{props.team.slug}
                  </span>
                </div>
              </div>
            </a>
          </Link>
          {props.team.role === "INVITEE" && (
            <>
              <Button type="button" color="secondary" onClick={declineInvite}>
                {t("reject")}
              </Button>
              <Button type="button" color="primary" className="ml-2" onClick={acceptInvite}>
                {t("accept")}
              </Button>
            </>
          )}
          <div className="flex space-x-1">
            {props.team.role === "OWNER" && (
              <span className="self-center px-3 py-1 mr-3 text-xs text-gray-700 capitalize bg-gray-100 border border-gray-100 rounded-md group-hover:border-gray-200">
                {t("owner")}
              </span>
            )}
            {props.team.role === "MEMBER" && (
              <Button type="button" color="primary" onClick={declineInvite}>
                {t("leave")}
              </Button>
            )}
            {props.team.role !== "INVITEE" && (
              <Tooltip content={t("copy_link_team")}>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      process.env.NEXT_PUBLIC_APP_URL + "/team/" + props.team.slug
                    );
                    showToast(t("link_copied"), "success");
                  }}
                  className="w-10 h-10 hover:bg-white "
                  size="icon"
                  color="minimal"
                  StartIcon={LinkIcon}
                  type="button"
                />
              </Tooltip>
            )}
            {props.team.role === "OWNER" && (
              <Dropdown>
                <DropdownMenuTrigger className="w-10 h-10 p-0 border border-transparent group text-neutral-400 hover:border-gray-200 hover:bg-white">
                  <DotsHorizontalIcon className="w-5 h-5 group-hover:text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Button
                      type="button"
                      color="minimal"
                      className="w-full"
                      onClick={() => props.onActionSelect("edit")}
                      StartIcon={PencilAltIcon}>
                      {" "}
                      {t("edit_team")}
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/team/${props.team.slug}`} passHref={true}>
                      <a target="_blank">
                        <Button type="button" color="minimal" className="w-full" StartIcon={ExternalLinkIcon}>
                          {" "}
                          {t("preview_team")}
                        </Button>
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          color="warn"
                          StartIcon={TrashIcon}
                          className="w-full">
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
                </DropdownMenuContent>
              </Dropdown>
            )}
          </div>
        </div>
      </li>
    )
  );
}
