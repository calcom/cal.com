import { AVATAR_FALLBACK, CAL_URL } from "@calcom/lib/constants";
import type { User } from "@calcom/prisma/client";
import { z } from "zod";

export const getAbsoluteAvatarUrl = (url: string): string => {
  const isAbsolute = z.string().url().safeParse(url).success;
  return isAbsolute ? url : CAL_URL + url;
};

/**
 * Gives an organization aware avatar url for a user
 * It ensures that the wrong avatar isn't fetched by ensuring that organizationId is always passed
 * It should always return a fully formed url
 */
export const getUserAvatarUrl = (user: Pick<User, "avatarUrl"> | undefined): string => {
  if (user?.avatarUrl) {
    return getAbsoluteAvatarUrl(user.avatarUrl);
  }
  return CAL_URL + AVATAR_FALLBACK;
};
