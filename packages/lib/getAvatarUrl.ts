import { z } from "zod";

import { AVATAR_FALLBACK, CAL_URL, WEBAPP_URL } from "@calcom/lib/constants";
import type { Team, User } from "@calcom/prisma/client";

/**
 * Gives an organization aware avatar url for a user
 * It ensures that the wrong avatar isn't fetched by ensuring that organizationId is always passed
 * It should always return a fully formed url
 */
export const getUserAvatarUrl = (user: Pick<User, "avatarUrl"> | undefined) => {
  if (user?.avatarUrl) {
    const isAbsoluteUrl = z.string().url().safeParse(user.avatarUrl).success;
    if (isAbsoluteUrl) {
      return user.avatarUrl;
    } else {
      return CAL_URL + user.avatarUrl;
    }
  }
  return CAL_URL + AVATAR_FALLBACK;
};

export function getTeamAvatarUrl(
  team: Pick<Team, "slug"> & {
    organizationId?: number | null;
    logoUrl?: string | null;
    requestedSlug?: string | null;
  }
) {
  if (team.logoUrl) {
    return team.logoUrl;
  }
  const slug = team.slug ?? team.requestedSlug;
  return `${WEBAPP_URL}/team/${slug}/avatar.png${team.organizationId ? `?orgId=${team.organizationId}` : ""}`;
}

export const getOrgAvatarUrl = (
  org: Pick<Team, "slug"> & {
    logoUrl?: string | null;
    requestedSlug?: string | null;
  }
) => {
  if (org.logoUrl) {
    return org.logoUrl;
  }
  const slug = org.slug ?? org.requestedSlug;
  return `${WEBAPP_URL}/org/${slug}/avatar.png`;
};
