"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { ApiKeyRepository } from "@calcom/lib/server/repository/apiKey";

const CACHE_TAGS = {
  API_KEY_LIST: "ApiKeyRepository.findApiKeysFromUserId",
} as const;

export const getCachedApiKeys = unstable_cache(
  async (userId: number) => {
    return await ApiKeyRepository.findApiKeysFromUserId({ userId });
  },
  ["getCachedApiKeys"],
  { revalidate: NEXTJS_CACHE_TTL, tags: [CACHE_TAGS.API_KEY_LIST] }
);

export async function revalidateApiKeysList() {
  revalidateTag(CACHE_TAGS.API_KEY_LIST);
}
