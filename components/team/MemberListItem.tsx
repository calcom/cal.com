import { TrashIcon, UsersIcon, DotsHorizontalIcon, LinkIcon, PencilAltIcon, ExternalLinkIcon } from "@heroicons/react/outline";
import Dropdown from "../ui/Dropdown";
import { useState } from "react";
import { Tooltip } from "@components/Tooltip";
import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";

export default function MemberListItem(props: any) {
  const [member, setMember] = useState(props.member);


  return (
    member && (
      <li className="divide-y">
        <div className="flex justify-between my-4">
          <div className="flex">
            <div className="relative rounded-full w-9 h-9 border border-gray-200"> 
                <img src={
                  props.member.avatar
                        ? props.member.avatar
                        : "https://eu.ui-avatars.com/api/?background=fff&color=039be5&name=" +
                          encodeURIComponent(props.member.name || "")
                } alt="Team Logo" className="rounded-full w-9 h-9"/>
            </div>
            {/* <UsersIcon className="text-gray-400 group-hover:text-gray-500 flex-shrink-0 -mt-4 mr-2 h-6 w-6 inline" /> */}
            <div className="inline-block ml-3">
              <span className="font-bold text-neutral-700 text-sm">{props.member.name}</span>
              <span className="text-xs text-gray-400 -mt-1 block">
                {props.member.email}
              </span>
            </div>
          </div>
          <div className="flex">
          {props.member.role === "INVITEE" && (
            <>
                <span className="h-6 px-3 py-1 bg-yellow-50 text-xs capitalize self-center text-yellow-700 rounded-md mr-2">Pending</span>
                <span className="h-6 px-3 py-1 bg-pink-50 text-xs capitalize self-center text-pink-700 rounded-md mr-4">Member</span>
            </>
          )}
          {props.member.role === "MEMBER" && (
            <span className="h-6 px-3 py-1 bg-pink-50 text-xs capitalize self-center text-pink-700 rounded-md mr-4">Member</span>
          )}
          {props.member.role === "OWNER" && (
              <span className="h-6 px-3 py-1 bg-blue-50 text-xs capitalize self-center text-blue-700 rounded-md mr-4">Owner</span>
          )}
              <Dropdown className="relative flex text-left">
                <button type="button" className="group text-neutral-400 p-2 border border-transparent hover:border-gray-200 focus:ring-black focus:border-black rounded-md">
                  <DotsHorizontalIcon className="group-hover:text-black w-5 h-5" />
                </button>
                <ul
                  role="menu"
                  className="z-10 origin-top-right absolute top-10 right-0 w-44 rounded-sm shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <li
                    className="text-sm text-gray-700  hover:bg-gray-100 hover:text-gray-900"
                    role="menuitem">
                    <Dialog>
                      <DialogTrigger onClick={(e)=>{e.stopPropagation();}} className="flex items-center px-4 py-2 w-full text-left bg-red-50 text-red-700">
                          <TrashIcon className="group-hover:text-red text-red-700 w-3.5 h-3.5 mr-2 inline-block" />
                          Remove User                          
                      </DialogTrigger>
                      <ConfirmationDialogContent
                          alert="danger"
                          title="Remove member"
                          confirmBtnText="Yes, remove member"
                          cancelBtnText = "Cancel"
                          onConfirm={() => props.onActionSelect("remove")}>
                          Are you sure you want to remove this member from the team?
                      </ConfirmationDialogContent>
                  </Dialog>                    
                  </li>
                </ul>
              </Dropdown>
            </div>
        </div>
      </li>
    )
  );
}
