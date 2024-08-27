import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync, getTeamUrlSync } from "@calcom/lib/getBookerUrl/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { AvatarGroup } from "@calcom/ui";

export interface EventMembersProps {
  /**
   * Used to determine whether all members should be shown or not.
   * In case of Round Robin type, members aren't shown.
   */
  schedulingType: BookerEvent["schedulingType"];
  users: BookerEvent["users"];
  profile: BookerEvent["profile"];
  entity: BookerEvent["entity"];
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

  const orgOrTeamAvatarItem =
    isDynamic || (!profile.image && !entity.logoUrl) || !entity.teamSlug
      ? []
      : [
          {
            // We don't want booker to be able to see the list of other users or teams inside the embed
            href: isEmbed
              ? null
              : entity.teamSlug
              ? getTeamUrlSync({ orgSlug: entity.orgSlug, teamSlug: entity.teamSlug })
              : getBookerBaseUrlSync(entity.orgSlug),
            image: entity.logoUrl ?? profile.image ?? "",
            alt: entity.name ?? profile.name ?? "",
            title: entity.name ?? profile.name ?? "",
          },
        ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:hidden ">
        <AvatarGroup
          size="sm"
          // className="border-muted"
          items={[
            ...orgOrTeamAvatarItem,
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

        <p className=" custom-mobile-text text-subtle mt-8 text-sm font-semibold">
          {showOnlyProfileName
            ? profile.name
            : shownUsers
                .map((user) => user.name)
                .filter((name) => name)
                .join(", ")}
        </p>
      </div>
      <div className="grid hidden grid-cols-1 md:block">
        <AvatarGroup
          size="xl"
          className="border-muted"
          items={[
            ...orgOrTeamAvatarItem,
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
        <p
          style={{ lineHeight: "32px", color: "#114559", fontSize: 22 }}
          className="text-subtle adjust-title text-small mt-2 font-semibold">
          {showOnlyProfileName
            ? profile.name
            : shownUsers
                .map((user) => user.name)
                .filter((name) => name)
                .join(", ")}
        </p>
      </div>
    </div>
  );
};
