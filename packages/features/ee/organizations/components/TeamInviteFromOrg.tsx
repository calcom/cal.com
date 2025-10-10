import type { PropsWithChildren } from "react";
import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import type { RouterOutputs } from "@calcom/trpc";
import { Avatar, TextField } from "@calcom/ui";

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
    <div className="bg-muted border-subtle flex flex-col rounded-md border p-4">
      <div className="-my-1">
        <TextField placeholder="Search..." onChange={(e) => setSearchQuery(e.target.value)} />
      </div>
      <hr className="border-subtle -mx-4 mt-2" />
      <div className="scrollbar min-h-48 flex max-h-48 flex-col space-y-0.5 overflow-y-scroll pt-2">
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
  const bookerUrl = useBookerUrl();
  return (
    <div
      key={member.userId}
      onClick={() => onChange()}
      className={classNames(
        "flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors",
        isSelected ? "bg-emphasis" : "hover:bg-subtle"
      )}>

      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <Avatar
          size="sm"
          alt="Users avatar"
          asChild
          imageSrc={`${bookerUrl}/${member.user.username}/avatar.png`}
        />
        <label
          htmlFor={`${member.user.id}`}
          className="text-emphasis cursor-pointer text-sm font-medium leading-none">
          {member.user.name || member.user.email || "Nameless User"}
        </label>
      </div>
      <div className="flex items-center justify-center">
        <input
          id={`${member.user.id}`}
          checked={isSelected}
          type="checkbox"
          onChange={onChange}
          className="h-4 w-4 cursor-pointer accent-primary border-subtle rounded focus:ring-primary focus:ring-offset-0"
        />
      </div>

    </div>
  );
}
