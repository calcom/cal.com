"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { AttributeRepository } from "@calcom/lib/server/repository/attribute";

const CACHE_TAGS = {
  ORG_ATTRIBUTES: "AttributeRepository.findAllByOrgIdWithOptions",
} as const;

export const getCachedOrgAttributes = unstable_cache(
  async (orgId: number) => {
    return await AttributeRepository.findAllByOrgIdWithOptions({ orgId });
  },
  ["getCachedOrgAttributes"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.ORG_ATTRIBUTES],
  }
);

export async function revalidateAttributesList() {
  revalidateTag(CACHE_TAGS.ORG_ATTRIBUTES);
}
