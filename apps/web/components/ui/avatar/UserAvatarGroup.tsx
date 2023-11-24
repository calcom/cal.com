import { CAL_URL } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { User } from "@calcom/prisma/client";
import { AvatarGroup } from "@calcom/ui";

type UserAvatarProps = Omit<React.ComponentProps<typeof AvatarGroup>, "items"> & {
  users: Pick<User, "organizationId" | "name" | "username">[];
};
export function UserAvatarGroup(props: UserAvatarProps) {
  const { users, ...rest } = props;
  return (
    <AvatarGroup
      {...rest}
      items={users.map((user) => ({
        href: `${CAL_URL}/${user.username}?redirect=false`,
        alt: user.name || "",
        title: user.name || "",
        image: getUserAvatarUrl(user),
      }))}
    />
  );
}
