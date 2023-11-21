import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { User } from "@calcom/prisma/client";
import { Avatar } from "@calcom/ui";

type UserAvatarProps = Omit<React.ComponentProps<typeof Avatar>, "alt" | "imageSrc"> & {
  user: Pick<User, "organizationId" | "name" | "username">;
  /**
   * Useful when allowing the user to upload their own avatar and showing the avatar before it's uploaded
   */
  previewSrc?: string | null;
};

/**
 * It is aware of the user's organization to correctly show the avatar from the correct URL
 */
export function UserAvatar(props: UserAvatarProps) {
  const { user, previewSrc = getUserAvatarUrl(user), ...rest } = props;
  return <Avatar {...rest} alt={user.name || "Nameless User"} imageSrc={previewSrc} />;
}
