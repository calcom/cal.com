import { getExternalAvatarService } from "@calcom/features/avatars/di/ExternalAvatarService.container";
import { unstable_cache } from "@calcom/lib/unstable_cache";

import type { TGetAvatarUrlInputSchema } from "./getAvatarUrl.schema";

const AVATAR_CACHE_TTL = 86400; // 24 hours

const getCachedAvatarUrl = unstable_cache(
  async (email: string) => {
    const service = getExternalAvatarService();
    return service.getImageUrl(email);
  },
  ["getAvatarUrl"],
  { revalidate: AVATAR_CACHE_TTL }
);

type GetAvatarUrlOptions = {
  input: TGetAvatarUrlInputSchema;
};

export const getAvatarUrlHandler = async ({ input }: GetAvatarUrlOptions) => {
  const url = await getCachedAvatarUrl(input.email);
  return { url };
};
