import { CAL_URL } from "@calcom/lib/constants";
import type { AvatarGroupProps } from "@calcom/ui";
import { AvatarGroup } from "@calcom/ui";

export const UserAvatars = ({
  profile,
  users,
  ...props
}: {
  profile: { image: string | null; name?: string | null; username?: string | null };
  showMembers: boolean;
  users: { username: string | null; name?: string | null }[];
} & Pick<AvatarGroupProps, "size" | "truncateAfter">) => {
  const showMembers = !users.find((user) => user.name === profile.name) && props.showMembers;
  return (
    <AvatarGroup
      items={
        [
          {
            image: profile.image,
            alt: profile.name,
            title: profile.name,
            href: profile.username ? `${CAL_URL}/${profile.username}` : undefined,
          },
          ...(showMembers
            ? users.map((user) => ({
                title: user.name,
                image: `${CAL_URL}/${user.username}/avatar.png`,
                alt: user.name || undefined,
                href: user.username ? `${CAL_URL}/${user.username}` : undefined,
              }))
            : []),
        ].filter((item) => !!item.image) as {
          image: string;
          alt?: string;
          title?: string;
          href?: string;
        }[]
      }
      size="sm"
      truncateAfter={props.truncateAfter}
    />
  );
};
