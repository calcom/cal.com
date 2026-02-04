import type { PropsWithChildren } from "react";
import { useState } from "react";

import type { RouterOutputs } from "@calcom/trpc/react";
import { TextField } from "@calcom/ui/components/form";
import { Avatar } from "@calcom/ui/components/avatar";
import classNames from "@calcom/ui/classNames";

type TeamInviteFromOrgProps = PropsWithChildren<{
  selectedEmails?: string | string[];
  handleOnChecked: (usersEmail: string) => void;
  orgMembers?: RouterOutputs["viewer"]["organizations"]["getMembers"];
}>;

const keysToCheck = ["name", "email", "username"] as const; // array of keys to check

export default function TeamInviteFromOrg({
  handleOnChecked,
  selectedEmails,
  orgMembers,
}: TeamInviteFromOrgProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredMembers = orgMembers?.filter((member) => {
    if (!searchQuery) {
      return true; // return all members if searchQuery is empty
    }
    const { user } = member ?? {}; // destructuring with default value in case member is undefined
    return keysToCheck.some((key) => user?.[key]?.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="bg-cal-muted border-subtle flex flex-col rounded-md border p-4">
      <div className="-my-1">
        <TextField placeholder="Search..." onChange={(e) => setSearchQuery(e.target.value)} />
      </div>
      <hr className="border-subtle -mx-4 mt-2" />
      <div className="scrollbar min-h-48 flex max-h-48 flex-col stack-y-0.5 overflow-y-scroll pt-2">
        <>
          {filteredMembers &&
            filteredMembers.map((member) => {
              const isSelected = Array.isArray(selectedEmails)
                ? selectedEmails.includes(member.user.email)
                : selectedEmails === member.user.email;
              return (
                <UserToInviteItem
                  key={member.user.id}
                  member={member}
                  isSelected={isSelected}
                  onChange={() => handleOnChecked(member.user.email)}
                />
              );
            })}
        </>
      </div>
    </div>
  );
}

function UserToInviteItem({
  member,
  isSelected,
  onChange,
}: {
  member: RouterOutputs["viewer"]["organizations"]["getMembers"][number];
  isSelected: boolean;
  onChange: () => void;
}) {
  return (
    <div
      key={member.userId}
      onClick={() => onChange()} // We handle this on click on the div also - for a11y we handle it with label and checkbox below
      className={classNames(
        "flex cursor-pointer items-center rounded-md px-2 py-1 transition",
        isSelected ? "bg-emphasis" : "hover:bg-subtle "
      )}>
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <Avatar size="sm" alt="Users avatar" asChild imageSrc={member.user.avatarUrl} />
        <label
          htmlFor={`${member.user.id}`}
          className="text-emphasis cursor-pointer text-sm font-medium leading-none">
          {member.user.name || member.user.email || "Nameless User"}
        </label>
      </div>
      <div className="ml-auto">
        <input
          id={`${member.user.id}`}
          checked={isSelected}
          type="checkbox"
          className="text-emphasis focus:ring-emphasis dark:text-muted border-default hover:bg-subtle inline-flex h-4 w-4 place-self-center justify-self-end rounded transition checked:bg-gray-800"
          onChange={() => {
            onChange();
          }}
        />
      </div>
    </div>
  );
}
