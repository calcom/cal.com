import {
  TrashIcon,
  DotsHorizontalIcon,
  LinkIcon,
  PencilAltIcon,
  ExternalLinkIcon,
} from "@heroicons/react/outline";
import Dropdown from "../ui/Dropdown";
import { useState } from "react";
import { Tooltip } from "@components/Tooltip";
import Link from "next/link";
import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Avatar from "@components/Avatar";
// import { useRouter } from "next/router";

interface Team {
  id: number;
  name: string | null;
  slug: string | null;
  logo: string | null;
  bio: string | null;
  role: string | null;
  hideBranding: boolean;
  prevState: null;
}

export default function TeamListItem(props: {
  onChange: () => void;
  key: number;
  team: Team;
  onActionSelect: (text: string) => void;
}) {
  const [team, setTeam] = useState<Team | null>(props.team);

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
        <div className="flex justify-between my-4">
          <div className="flex">
            <Avatar
              imageSrc={
                props.team.logo
                  ? props.team.logo
                  : "https://eu.ui-avatars.com/api/?background=fff&color=039be5&name=" +
                    encodeURIComponent(props.team.name || "")
              }
              displayName="Team Logo"
              className="rounded-full w-9 h-9"
            />
            <div className="inline-block ml-3">
              <span className="text-sm font-bold text-neutral-700">{props.team.name}</span>
              <span className="block -mt-1 text-xs text-gray-400">
                {window.location.hostname}/{props.team.slug}
              </span>
            </div>
          </div>
          {props.team.role === "INVITEE" && (
            <div>
              <button
                className="px-3 py-1 ml-2 text-green-500 bg-transparent border border-green-500 rounded-sm btn-sm"
                onClick={acceptInvite}>
                Accept invitation
              </button>
              <button className="px-2 py-1 ml-1 bg-transparent btn-sm">
                <TrashIcon className="inline w-6 h-6 -mt-1 text-gray-400" onClick={declineInvite} />
              </button>
            </div>
          )}
          {props.team.role === "MEMBER" && (
            <div>
              <button
                onClick={declineInvite}
                className="px-3 py-1 ml-2 text-gray-400 bg-transparent border border-gray-400 rounded-sm btn-sm">
                Leave
              </button>
            </div>
          )}
          {props.team.role === "OWNER" && (
            <div className="flex">
              <span className="self-center h-6 px-3 py-1 text-xs text-gray-700 capitalize rounded-md bg-gray-50">
                Owner
              </span>
              <Tooltip content="Copy link">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.hostname + "/" + props.team.slug);
                  }}
                  className="p-2 ml-4 border border-transparent rounded-md group text-neutral-400 hover:border-gray-200 focus:ring-black focus:border-black">
                  <LinkIcon className="w-5 h-5 group-hover:text-black" />
                </button>
              </Tooltip>
              <Dropdown className="relative flex text-left">
                <button className="p-2 border border-transparent rounded-md group text-neutral-400 hover:border-gray-200 focus:ring-black focus:border-black">
                  <DotsHorizontalIcon className="w-5 h-5 group-hover:text-black" />
                </button>
                <ul
                  role="menu"
                  className="absolute right-0 z-10 origin-top-right bg-white rounded-sm shadow-lg top-10 w-44 ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <li className="text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                    <button
                      className="flex items-center w-full px-4 py-2 text-left"
                      onClick={() => props.onActionSelect("edit")}>
                      <PencilAltIcon className="group-hover:text-black text-gray-700 w-3.5 h-3.5 mr-2 inline-block" />{" "}
                      Edit team
                    </button>
                  </li>
                  <li className="text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                    <Link href={`/${props.team.slug}`} passHref={true}>
                      <a target="_blank">
                        <button className="flex items-center w-full px-4 py-2 text-left">
                          <ExternalLinkIcon className="group-hover:text-black text-gray-700 w-3.5 h-3.5 mr-2 inline-block" />{" "}
                          Preview team page
                        </button>
                      </a>
                    </Link>
                  </li>
                  <li className="text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                    <Dialog>
                      <DialogTrigger
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="flex items-center w-full px-4 py-2 text-left text-red-700 bg-red-50">
                        <TrashIcon className="group-hover:text-red text-red-700 w-3.5 h-3.5 mr-2 inline-block" />
                        Disband Team
                      </DialogTrigger>
                      <ConfirmationDialogContent
                        alert="danger"
                        title="Disband Team"
                        confirmBtnText="Yes, disband team"
                        cancelBtnText="Cancel"
                        onConfirm={() => props.onActionSelect("disband")}>
                        Are you sure you want to disband this team? Anyone who you&apos;ve shared this team
                        link with will no longer be able to book using it.
                      </ConfirmationDialogContent>
                    </Dialog>
                  </li>
                </ul>
              </Dropdown>
            </div>
          )}
        </div>
      </li>
    )
  );
}
