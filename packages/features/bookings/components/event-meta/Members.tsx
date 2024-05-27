import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { getTeamUrlSync } from "@calcom/lib/getBookerUrl/client";
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
  entity: PublicEvent["entity"];
}

export const EventMembers = ({ schedulingType, users, profile, entity }: EventMembersProps) => {
  const username = useBookerStore((state) => state.username);
  const isDynamic = !!(username && username.indexOf("+") > -1);
  const isEmbed = useIsEmbed();
  const showMembers = schedulingType !== SchedulingType.ROUND_ROBIN;
  const shownUsers = showMembers ? users : [];
  // In some cases we don't show the user's names, but only show the profile name.
  const showOnlyProfileName =
    (profile.name && schedulingType === SchedulingType.ROUND_ROBIN) ||
    !users.length ||
    (profile.name !== users[0].name && schedulingType === SchedulingType.COLLECTIVE);

  const orgAvatarItem =
    entity.orgSlug && !(isDynamic && !profile.image)
      ? [
          {
            // We don't want booker to be able to see the list of other users or teams inside the embed
            href: isEmbed
              ? null
              : entity.teamSlug
              ? getTeamUrlSync({ orgSlug: entity.orgSlug, teamSlug: entity.teamSlug })
              : getBookerBaseUrlSync(entity.orgSlug),
            image: profile.image || "",
            alt: profile.name || "",
            title: profile.name || "",
          },
        ]
      : [];

  return (
    <>
      <AvatarGroup
        size="sm"
        className="border-muted"
        items={[
          ...orgAvatarItem,
          ...shownUsers.map((user) => ({
            href: `${getBookerBaseUrlSync(user.profile?.organization?.slug ?? null)}/${
              user.profile?.username
            }?redirect=false`,
            alt: user.name || "",
            title: user.name || "",
            image: getUserAvatarUrl(user),
          })),
        ]}
      />

      <p className="text-subtle mt-2 text-sm font-semibold">
        {showOnlyProfileName
          ? profile.name
          : shownUsers
              .map((user) => user.name)
              .filter((name) => name)
              .join(", ")}
      </p>
    </>
  );
};
