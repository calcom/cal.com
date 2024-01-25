import { signIn } from "next-auth/react";

import classNames from "@calcom/lib/classNames";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Avatar, DropdownItem, DropdownMenuItem, DropdownMenuSeparator } from "@calcom/ui";

export const LinkedUsersDropdown = ({ small = false }) => {
  const { data: user } = useMeQuery();
  const bookerUrl = useBookerUrl();
  if (!user) return null;
  if (user.linkedTo.length < 1) return null;
  return (
    <>
      {user.linkedTo.map((linkedUser) => (
        <DropdownMenuItem key={linkedUser.id}>
          <DropdownItem
            type="button"
            StartIcon={(props) => (
              <Avatar
                size={small ? "xs" : "xsm"}
                imageSrc={`${bookerUrl}/${linkedUser.username}/avatar.png`}
                alt={linkedUser.username || "Nameless User"}
                className={classNames("overflow-hidden", props.className)}
              />
            )}
            onClick={() => {
              signIn("linked-user-auth", { id: linkedUser.id });
            }}>
            {linkedUser.name}
          </DropdownItem>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
    </>
  );
};
