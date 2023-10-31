import { WEBAPP_URL } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { Team, User } from "@calcom/prisma/client";
import { AvatarGroup } from "@calcom/ui";

type UserAvatarProps = Omit<React.ComponentProps<typeof AvatarGroup>, "items"> & {
  users: Pick<User, "organizationId" | "name" | "username">[];
  organization: Pick<Team, "slug" | "name">;
};

export function UserAvatarGroupWithOrg(props: UserAvatarProps) {
  const { users, organization, ...rest } = props;
  const items = [
    {
      image: `${WEBAPP_URL}/team/${organization.slug}/avatar.png`,
      alt: organization.name || undefined,
      title: organization.name,
    },
  ].concat(
    users.map((user) => {
      return {
        image: getUserAvatarUrl(user),
        alt: user.name || undefined,
        title: user.name || user.username || "",
      };
    })
  );
  users.unshift();
  return <AvatarGroup {...rest} items={items} />;
}
