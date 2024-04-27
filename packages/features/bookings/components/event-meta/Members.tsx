import { useIsPlatform } from "@calcom/atoms/monorepo";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
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
  const isPlatform = useIsPlatform();
  const isEmbed = useIsEmbed();
  const showMembers = !!schedulingType && schedulingType !== SchedulingType.ROUND_ROBIN;
  const shownUsers = showMembers && !isPlatform ? users : [];

  // In some cases we don't show the user's names, but only show the profile name.
  const showOnlyProfileName =
    (profile.name && schedulingType === SchedulingType.ROUND_ROBIN) ||
    !users.length ||
    (profile.name !== users[0].name && schedulingType === SchedulingType.COLLECTIVE);

  return (
    <>
      <AvatarGroup
        size="sm"
        className="border-muted"
        items={[
          {
            // We don't want booker to be able to see the list of other users or teams inside the embed
            href: isEmbed ? null : getBookerBaseUrlSync(entity.orgSlug),
            image: profile.image || "",
            alt: profile.name || "",
            title: profile.name || "",
          },
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
