import { CAL_URL } from "@calcom/lib/constants";
import { AvatarGroup } from "@calcom/ui/components/avatar";

import { PublicEvent } from "../types";

export interface EventMembersProps {
  /**
   * Used to determine whether all members should be shown or not.
   * In case of Round Robin type, members aren't shown.
   */
  meetingType: PublicEvent["schedulingType"];
  users: PublicEvent["users"];
}

export const EventMembers = ({ meetingType, users }: EventMembersProps) => {
  // @TODO: Add profile meeting name in (for teams etc)
  // @TODO Dynamic check on meeting type to not render users.
  return (
    <>
      <AvatarGroup
        size="sm"
        className="dark:border-darkgray-100 border-2 border-white"
        items={users.map((user) => ({
          title: `${user.name}`,
          image: `${CAL_URL}/${user.username}/avatar.png`,
          alt: user.name || undefined,
          href: user.username ? `${CAL_URL}/${user.username}` : undefined,
        }))}
      />
      <p className="dark:text-darkgray-600 text-sm text-gray-600">
        {users
          .map((user) => user.name)
          .filter((name) => name)
          .join(", ")}
      </p>
    </>
  );
};
