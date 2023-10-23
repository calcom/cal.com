import { WEBAPP_URL } from "@calcom/lib/constants";
import { AVATAR_FALLBACK } from "@calcom/lib/constants";
import type { User, Team } from "@calcom/prisma/client";

/**
 * Gives an organization aware avatar url for a user
 * It ensures that the wrong avatar isn't fetched by ensuring that organizationId is always passed
 */
export const getUserAvatarUrl = (user: Pick<User, "username" | "organizationId">) => {
  if (!user.username) return AVATAR_FALLBACK;
  // avatar.png automatically redirects to fallback avatar if user doesn't have one
  return `${WEBAPP_URL}/${user.username}/avatar.png${
    user.organizationId ? `?orgId=${user.organizationId}` : ""
  }`;
};

export const getOrgAvatarUrl = (org: {
  id: Team["id"];
  slug: Team["slug"];
  requestedSlug: string | null;
}) => {
  const slug = org.slug ?? org.requestedSlug;
  return `${WEBAPP_URL}/org/${slug}/avatar.png`;
};
