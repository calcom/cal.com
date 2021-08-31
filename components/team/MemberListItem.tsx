import { DotsHorizontalIcon, UserRemoveIcon } from "@heroicons/react/outline";
import Dropdown from "../ui/Dropdown";
import { useState } from "react";
import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Avatar from "@components/Avatar";
import { Member } from "@lib/member";
import Button from "@components/ui/Button";

export default function MemberListItem(props: {
  member: Member;
  onActionSelect: (text: string) => void;
  onChange: (text: string) => void;
}) {
  const [member] = useState(props.member);

  return (
    member && (
      <li className="divide-y">
        <div className="flex justify-between my-4">
          <div className="flex">
            <Avatar
              imageSrc={
                props.member.avatar
                  ? props.member.avatar
                  : "https://eu.ui-avatars.com/api/?background=fff&color=039be5&name=" +
                    encodeURIComponent(props.member.name || "")
              }
              displayName={props.member.name || ""}
              className="rounded-full w-9 h-9"
            />
            <div className="inline-block ml-3">
              <span className="text-sm font-bold text-neutral-700">{props.member.name}</span>
              <span className="block -mt-1 text-xs text-gray-400">{props.member.email}</span>
            </div>
          </div>
          <div className="flex">
            {props.member.role === "INVITEE" && (
              <>
                <span className="self-center h-6 px-3 py-1 mr-2 text-xs text-yellow-700 capitalize rounded-md bg-yellow-50">
                  Pending
                </span>
                <span className="self-center h-6 px-3 py-1 mr-4 text-xs text-pink-700 capitalize rounded-md bg-pink-50">
                  Member
                </span>
              </>
            )}
            {props.member.role === "MEMBER" && (
              <span className="self-center h-6 px-3 py-1 mr-4 text-xs text-pink-700 capitalize rounded-md bg-pink-50">
                Member
              </span>
            )}
            {props.member.role === "OWNER" && (
              <span className="self-center h-6 px-3 py-1 mr-4 text-xs text-blue-700 capitalize rounded-md bg-blue-50">
                Owner
              </span>
            )}
            <Dropdown className="relative flex text-left">
              <Button type="button" color="minimal" className="ml-2">
                <DotsHorizontalIcon className="w-5 h-5 group-hover:text-black" />
              </Button>
              <ul
                role="menu"
                className="absolute right-0 z-10 origin-top-right bg-white rounded-sm shadow-lg top-10 w-44 ring-1 ring-black ring-opacity-5 focus:outline-none">
                <li className="text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                  <Dialog>
                    <DialogTrigger
                      as={Button}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      color="warn"
                      StartIcon={UserRemoveIcon}
                      className="w-full">
                      Remove User
                    </DialogTrigger>
                    <ConfirmationDialogContent
                      variety="danger"
                      title="Remove member"
                      confirmBtnText="Yes, remove member"
                      cancelBtnText="Cancel"
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
