import type { Team } from "@calcom/prisma/client";

const placeholderAvatarCache = new Map<string, string>();

/**
 * Given an avatar URL and a name, return the appropriate avatar URL. In the
 * event that no avatar URL is provided, return a placeholder avatar URL from
 * ui-avatars.com.
 *
 * ui-avatars.com is a free service that generates placeholder avatars based on
 * a name. It is used here to provide a consistent placeholder avatar for users
 * who have not uploaded an avatar.
 */
export function getPlaceholderAvatar(avatar: string | null | undefined, name: string | null | undefined) {
  if (avatar) {
    return avatar;
  }

  const cacheKey = `${name || ""}`;
  if (placeholderAvatarCache.has(cacheKey)) {
    return placeholderAvatarCache.get(cacheKey)!;
  }

  const placeholderUrl = `https://eu.ui-avatars.com/api/?background=fff&color=f9f9f9&bold=true&background=000000&name=${encodeURIComponent(
    name || ""
  )}`;

  placeholderAvatarCache.set(cacheKey, placeholderUrl);
  return placeholderUrl;
}

export function getOrgOrTeamAvatar(
  team: Pick<Team, "logoUrl" | "name"> & { parent?: Pick<Team, "logoUrl"> | null }
) {
  return getPlaceholderAvatar(team.logoUrl || team.parent?.logoUrl, team.name);
}
