import { CAL_URL } from "@calcom/lib/constants";
import { AvatarGroup } from "@calcom/ui";

import type { PublicEvent } from "../../types";
import { SchedulingType } from ".prisma/client";

export interface EventMembersProps {
  /**
   * Used to determine whether all members should be shown or not.
   * In case of Round Robin type, members aren't shown.
   */
  schedulingType: PublicEvent["schedulingType"];
  users: PublicEvent["users"];
  profile: PublicEvent["profile"];
}

export const EventMembers = ({ schedulingType, users }: EventMembersProps) => {
  const showMembers = schedulingType !== SchedulingType.ROUND_ROBIN;
  const shownUsers = showMembers ? users : [];

  const avatars = shownUsers
    .map((user) => ({
      title: `${user.name}`,
      image: `${CAL_URL}/${user.username}/avatar.png`,
      alt: user.name || undefined,
      href: user.username ? `${CAL_URL}/${user.username}` : undefined,
    }))
    .filter((item) => !!item.image);

  return (
    <>
      <AvatarGroup size="sm" className="dark:border-darkgray-100 border-2 border-white" items={avatars} />
      <p className="dark:text-darkgray-600 text-sm text-gray-600">
        {users
          .map((user) => user.name)
          .filter((name) => name)
          .join(", ")}
      </p>
    </>
  );
};
