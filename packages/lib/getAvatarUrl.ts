import { z } from "zod";

import { AVATAR_FALLBACK, LOGO, MSTILE_ICON, CAL_URL } from "@calcom/lib/constants";
import type { User } from "@calcom/prisma/client";

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

export const getBrandLogoUrl = (
  entity: { bannerUrl?: string | null; faviconUrl?: string | null },
  isFavicon?: boolean
) => {
  const url = isFavicon ? entity?.faviconUrl : entity?.bannerUrl || entity?.faviconUrl;
  if (url) {
    // If URL starts with http:// or https://, it's absolute
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    // If URL starts with /, it's already an absolute path, return as-is
    if (url.startsWith("/")) {
      return url;
    }
    // Otherwise, prepend CAL_URL
    return CAL_URL + url;
  }
  if (isFavicon) return MSTILE_ICON;
  return LOGO;
};
