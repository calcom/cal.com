import { getTeamAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { Team } from "@calcom/prisma/client";
import { Avatar } from "@calcom/ui";

type TeamAvatarProps = Omit<React.ComponentProps<typeof Avatar>, "alt" | "imageSrc"> & {
  team: Pick<Team, "slug" | "name"> & {
    organizationId?: number | null;
    requestedSlug: string | null;
  };
  /**
   * Useful when allowing the user to upload their own avatar and showing the avatar before it's uploaded
   */
  previewSrc?: string | null;
};

/**
 * It is aware of the user's organization to correctly show the avatar from the correct URL
 */
export function TeamAvatar(props: TeamAvatarProps) {
  const { team, previewSrc = getTeamAvatarUrl(team), ...rest } = props;
  return <Avatar {...rest} alt={team.name || "Nameless Team"} imageSrc={previewSrc} />;
}
