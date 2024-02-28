import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import type { User } from "@calcom/prisma/client";
import type { UserProfile } from "@calcom/types/UserProfile";
import { AvatarGroup } from "@calcom/ui";

type UserAvatarProps = Omit<React.ComponentProps<typeof AvatarGroup>, "items"> & {
  users: (Pick<User, "name" | "username" | "avatarUrl"> & {
    profile: Omit<UserProfile, "upId">;
  })[];
};
export function UserAvatarGroup(props: UserAvatarProps) {
  const { users, ...rest } = props;

  return (
    <AvatarGroup
      {...rest}
      items={users.map((user) => ({
        href: `${getBookerBaseUrlSync(user.profile?.organization?.slug ?? null)}/${
          user.profile?.username
        }?redirect=false`,
        alt: user.name || "",
        title: user.name || "",
        image: getUserAvatarUrl(user),
      }))}
    />
  );
}
