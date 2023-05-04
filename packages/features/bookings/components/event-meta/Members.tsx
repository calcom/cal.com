import { CAL_URL } from "@calcom/lib/constants";
import { SchedulingType } from "@calcom/prisma/enums";
import { AvatarGroup } from "@calcom/ui";

import type { PublicEvent } from "../../types";

export interface EventMembersProps {
  /**
   * Used to determine whether all members should be shown or not.
   * In case of Round Robin type, members aren't shown.
   */
  schedulingType: PublicEvent["schedulingType"];
  users: PublicEvent["users"];
  profile: PublicEvent["profile"];
}

export const EventMembers = ({ schedulingType, users, profile }: EventMembersProps) => {
  const showMembers = schedulingType !== SchedulingType.ROUND_ROBIN;
  const shownUsers = showMembers ? [...users, profile] : [profile];

  const avatars = shownUsers
    .map((user) => ({
      title: `${user.name}`,
      image: "image" in user ? `${user.image}` : `${CAL_URL}/${user.username}/avatar.png`,
      alt: user.name || undefined,
      href: user.username ? `${CAL_URL}/${user.username}` : undefined,
    }))
    .filter((item) => !!item.image)
    .filter((item, index, self) => {
      // Filter out duplicates by checking both the image and the href,
      // sometimes we tend to get the same avatar prefixed with app.cal.com and cal.com,
      // so only the image match wouldn't work here.
      const imageIsUnique = self.findIndex((t) => t.image === item.image) === index;
      const hrefIsUnique = self.findIndex((t) => t.href === item.href) === index;
      return imageIsUnique && (!item.href || hrefIsUnique);
    });

  return (
    <>
      <AvatarGroup size="sm" className="border-muted" items={avatars} />
      <p className="text-subtle text-sm font-semibold">
        {users
          .map((user) => user.name)
          .filter((name) => name)
          .join(", ")}
      </p>
    </>
  );
};
