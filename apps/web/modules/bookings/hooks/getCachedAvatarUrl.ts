"use server";

import { unstable_cache } from "next/cache";

import { getExternalAvatarService } from "@calcom/features/avatars/di/ExternalAvatarService.container";

const AVATAR_CACHE_TTL = 86400; // 24 hours

export const getCachedAvatarUrl = unstable_cache(
  async (email: string) => {
    const service = getExternalAvatarService();
    return service.getImageUrl(email);
  },
  ["getAvatarUrl"],
  {
    revalidate: AVATAR_CACHE_TTL,
  }
);
