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
  entity: Partial<Pick<User | Team, "bannerUrl" | "faviconUrl">>,
  isFavicon?: boolean
) => {
  const url = entity?.bannerUrl || entity?.faviconUrl;
  if (url) {
    const isAbsoluteUrl = z.string().url().safeParse(url).success;
    if (isAbsoluteUrl) {
      return url;
    } else {
      return CAL_URL + url;
    }
  }
  if (isFavicon) return CAL_URL + MSTILE_ICON;
  return CAL_URL + LOGO;
};
