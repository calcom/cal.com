import type { PropsWithChildren } from "react";
import { useState } from "react";

import { AVATAR_FALLBACK } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Avatar, AvatarImage } from "@coss/ui/components/avatar";
import { Checkbox } from "@coss/ui/components/checkbox";
import { Label } from "@coss/ui/components/label";
import { Input } from "@coss/ui/components/input";
import { ScrollArea } from "@coss/ui/components/scroll-area";

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
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const filteredMembers = orgMembers?.filter((member) => {
    if (!searchQuery) {
      return true; // return all members if searchQuery is empty
    }
    const { user } = member ?? {}; // destructuring with default value in case member is undefined
    return keysToCheck.some((key) => user?.[key]?.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="bg-muted rounded-xl">
      <div className="px-2 pt-2">
        <Input
          placeholder="Search..."
          value={searchQuery}
          onValueChange={(value) => setSearchQuery(value)}
        />
      </div>
      <ScrollArea className="h-44" scrollFade>
        <div className="px-2 py-2 min-h-full flex flex-col">
          {!filteredMembers?.length ? (
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-muted-foreground py-4 text-center text-sm">
                {t("no_members_found")}
              </p>
            </div>
          ) : (
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
            })
          )}
        </div>
      </ScrollArea>
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
  const displayName = member.user.name || member.user.email || "Nameless User";

  return (
    <Label
      className="flex cursor-pointer items-center rounded-lg px-2 py-1 hover:bg-muted">
      <Checkbox checked={isSelected} onCheckedChange={() => onChange()} />
      <Avatar className="size-6">
        <AvatarImage
          src={member.user.avatarUrl ?? AVATAR_FALLBACK}
          alt={displayName}
          onError={(e) => {
            e.currentTarget.src = AVATAR_FALLBACK;
          }}
        />
      </Avatar>
      {displayName}
    </Label>
  );
}
