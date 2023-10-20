import { getAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { User } from "@calcom/prisma/client";
import { Avatar } from "@calcom/ui";

type UserAvatarProps = Omit<React.ComponentProps<typeof Avatar>, "imageSrc" | "alt"> & {
  user: Pick<User, "organizationId" | "name" | "username">;
};
export function UserAvatar(props: UserAvatarProps) {
  const { user, ...rest } = props;
  return <Avatar {...rest} alt={user.name || ""} imageSrc={getAvatarUrl(user)} />;
}
