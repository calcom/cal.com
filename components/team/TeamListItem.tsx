import { TrashIcon, DotsHorizontalIcon, LinkIcon, PencilAltIcon, ExternalLinkIcon } from "@heroicons/react/outline";
import Dropdown from "../ui/Dropdown";
import { useState } from "react";
import { Tooltip } from "@components/Tooltip";
import Link from "next/link";
import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Avatar from "@components/Avatar";

export default function TeamListItem(props) {
  const [team, setTeam] = useState(props.team);

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
              <span className="font-bold text-neutral-700 text-sm">{props.team.name}</span>
              <span className="text-xs text-gray-400 -mt-1 block">{window.location.hostname}/
                {props.team.slug}
              </span>
            </div>
          </div>
          {props.team.role === "INVITEE" && (
            <div>
              <button
                className="btn-sm bg-transparent text-green-500 border border-green-500 px-3 py-1 rounded-sm ml-2"
                onClick={acceptInvite}>
                Accept invitation
              </button>
              <button className="btn-sm bg-transparent px-2 py-1 ml-1">
                <TrashIcon className="h-6 w-6 inline text-gray-400 -mt-1" onClick={declineInvite} />
              </button>
            </div>
          )}
          {props.team.role === "MEMBER" && (
            <div>
              <button
                onClick={declineInvite}
                className="btn-sm bg-transparent text-gray-400 border border-gray-400 px-3 py-1 rounded-sm ml-2">
                Leave
              </button>
            </div>
          )}
          {props.team.role === "OWNER" && (
            <div className="flex">
              <span className="h-6 px-3 py-1 bg-gray-50 text-xs capitalize self-center text-gray-700 rounded-md">Owner</span>
              <Tooltip content="Copy link">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      window.location.hostname + "/" + props.team.slug
                    );
                  }}
                  className="group text-neutral-400 p-2 border border-transparent hover:border-gray-200 ml-4 focus:ring-black focus:border-black rounded-md">
                  <LinkIcon className="group-hover:text-black w-5 h-5" />
                </button>
              </Tooltip>
              <Dropdown className="relative flex text-left">
                <button className="group text-neutral-400 p-2 border border-transparent hover:border-gray-200 focus:ring-black focus:border-black rounded-md">
                  <DotsHorizontalIcon className="group-hover:text-black w-5 h-5" />
                </button>
                <ul
                  role="menu"
                  className="z-10 origin-top-right absolute top-10 right-0 w-44 rounded-sm shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <li
                    className="text-sm text-gray-700  hover:bg-gray-100 hover:text-gray-900"
                    role="menuitem">
                    <button className="flex items-center px-4 py-2 w-full text-left" onClick={() => props.onActionSelect("edit")}>
                      <PencilAltIcon className="group-hover:text-black text-gray-700 w-3.5 h-3.5 mr-2 inline-block" /> Edit team
                    </button>
                  </li>
                  <li
                    className="text-sm text-gray-700  hover:bg-gray-100 hover:text-gray-900"
                    role="menuitem">
                      <Link href={`/${props.team.slug}`} passHref={true}>
                        <a target="_blank">
                          <button className="flex items-center px-4 py-2 w-full text-left">
                            <ExternalLinkIcon className="group-hover:text-black text-gray-700 w-3.5 h-3.5 mr-2 inline-block" /> Preview team page
                          </button>
                        </a>
                      </Link>
                  </li>
                  <li
                    className="text-sm text-gray-700  hover:bg-gray-100 hover:text-gray-900"
                    role="menuitem">
                    <Dialog>
                      <DialogTrigger onClick={(e)=>{e.stopPropagation();}} className="flex items-center px-4 py-2 w-full text-left bg-red-50 text-red-700">
                          <TrashIcon className="group-hover:text-red text-red-700 w-3.5 h-3.5 mr-2 inline-block" />
                          Disband Team                          
                      </DialogTrigger>
                      <ConfirmationDialogContent
                        alert="danger"
                        title="Disband Team"
                        confirmBtnText="Yes, disband team"
                        cancelBtnText = "Cancel"
                        onConfirm={() => props.onActionSelect("disband")}>
                        Are you sure you want to disband this team? Anyone who you&apos;ve shared this team link
                        with will no longer be able to book using it.
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
