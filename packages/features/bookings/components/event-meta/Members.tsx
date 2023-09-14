import { usePathname } from "next/navigation";

import { getOrgFullDomain } from "@calcom/features/ee/organizations/lib/orgDomains";
import { CAL_URL, WEBAPP_URL } from "@calcom/lib/constants";
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

type Avatar = {
  title: string;
  image: string | undefined;
  alt: string | undefined;
  href: string | undefined;
};

type AvatarWithRequiredImage = Avatar & { image: string };

export const EventMembers = ({ schedulingType, users, profile, entity }: EventMembersProps) => {
  const pathname = usePathname();
  const showMembers = schedulingType !== SchedulingType.ROUND_ROBIN;
  const shownUsers = showMembers ? users : [];

  // In some cases we don't show the user's names, but only show the profile name.
  const showOnlyProfileName =
    (profile.name && schedulingType === SchedulingType.ROUND_ROBIN) ||
    !users.length ||
    (profile.name !== users[0].name && schedulingType === SchedulingType.COLLECTIVE);

  const avatars: Avatar[] = shownUsers.map((user) => ({
    title: `${user.name || user.username}`,
    image: "image" in user ? `${user.image}` : `/${user.username}/avatar.png`,
    alt: user.name || undefined,
    href: `/${user.username}`,
  }));

  // Add organization avatar
  if (entity.orgSlug) {
    avatars.unshift({
      title: `${entity.name}`,
      image: `${WEBAPP_URL}/team/${entity.orgSlug}/avatar.png`,
      alt: entity.name || undefined,
      href: getOrgFullDomain(entity.orgSlug),
    });
  }

  // Add profile later since we don't want to force creating an avatar for this if it doesn't exist.
  avatars.unshift({
    title: `${profile.name || profile.username}`,
    image: "logo" in profile && profile.logo ? `${profile.logo}` : undefined,
    alt: profile.name || undefined,
    href: profile.username
      ? `${CAL_URL}` + (pathname.indexOf("/team/") !== -1 ? "/team" : "") + `/${profile.username}`
      : undefined,
  });

  const uniqueAvatars = avatars
    .filter((item): item is AvatarWithRequiredImage => !!item.image)
    .filter((item, index, self) => self.findIndex((t) => t.image === item.image) === index);

  return (
    <>
      <AvatarGroup size="sm" className="border-muted" items={uniqueAvatars} />
      <p className="text-subtle text-sm font-semibold">
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
