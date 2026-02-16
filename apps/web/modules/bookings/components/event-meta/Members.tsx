import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { SchedulingType } from "@calcom/prisma/enums";
import { AvatarGroup } from "@calcom/ui/components/avatar";

export interface EventMembersProps {
  /**
   * Used to determine whether all members should be shown or not.
   * In case of Round Robin type, members aren't shown.
   */
  schedulingType: BookerEvent["schedulingType"];
  users: BookerEvent["subsetOfUsers"];
  profile: BookerEvent["profile"];
  entity: BookerEvent["entity"];
  isPrivateLink: boolean;
  roundRobinHideOrgAndTeam?: boolean;
  hideOrgTeamAvatar?: boolean;
}

export const EventMembers = ({
  schedulingType,
  users,
  profile,
  entity,
  isPrivateLink,
  roundRobinHideOrgAndTeam,
  hideOrgTeamAvatar,
}: EventMembersProps) => {
  const username = useBookerStore((state) => state.username);
  const isDynamic = !!(username && username.indexOf("+") > -1);
  const isEmbed = useIsEmbed();
  const isPlatform = useIsPlatform();

  const showMembers = schedulingType !== SchedulingType.ROUND_ROBIN;
  const shownUsers = showMembers ? users : [];
  // In some cases we don't show the user's names, but only show the profile name.
  const showOnlyProfileName =
    (profile.name && schedulingType === SchedulingType.ROUND_ROBIN) ||
    !users.length ||
    (profile.name !== users[0].name && schedulingType === SchedulingType.COLLECTIVE);

  if (schedulingType === SchedulingType.ROUND_ROBIN && roundRobinHideOrgAndTeam) {
    return <div className="h-6" />;
  }

  if (schedulingType === SchedulingType.ROUND_ROBIN && hideOrgTeamAvatar) {
    return <p className="text-subtle pt-6 text-sm font-semibold">{profile.name}</p>;
  }

  const getEntityBaseUrl = () => {
    const baseUrl = getBookerBaseUrlSync(entity.orgSlug ?? null, {
      protocol: true,
      customDomain: entity.customDomain,
    });
    return entity.teamSlug ? `${baseUrl}/${entity.teamSlug}` : baseUrl;
  };

  const orgOrTeamAvatarItem =
    hideOrgTeamAvatar || isDynamic || (!profile.image && !entity.logoUrl) || !entity.teamSlug
      ? []
      : [
        {
          // We don't want booker to be able to see the list of other users or teams inside the embed
          href:
            isEmbed || isPlatform || isPrivateLink || entity.hideProfileLink ? null : getEntityBaseUrl(),
          image: entity.logoUrl ?? profile.image ?? "",
          alt: entity.name ?? profile.name ?? "",
          title: entity.name ?? profile.name ?? "",
        },
      ];

  return (
    <>
      <AvatarGroup
        size="sm"
        className="border-muted"
        items={[
          ...orgOrTeamAvatarItem,
          ...shownUsers.map((user) => {
            const org = user.profile?.organization;
            const customDomain = org?.customDomain?.slug ?? null;
            const baseUrl = getBookerBaseUrlSync(org?.slug ?? null, {
              protocol: true,
              customDomain,
            });
            return {
              href:
                isPlatform || isPrivateLink || entity.hideProfileLink
                  ? null
                  : `${baseUrl}/${user.profile?.username}?redirect=false`,
              alt: user.name || "",
              title: user.name || "",
              image: getUserAvatarUrl(user),
            };
          }),
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
