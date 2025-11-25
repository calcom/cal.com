"use server";

import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";

import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { filterQuerySchemaStrict } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";

export const CACHE_TAGS = {
  WORKFLOWS_LIST: "WorkflowRepository.filteredList",
} as const;

type Filters = z.infer<typeof filterQuerySchemaStrict>;

/**
 * Cached workflow list fetcher with per-user, per-filter cache keys
 * to prevent data leakage across users and filter combinations
 */
export async function getCachedWorkflowsFilteredList(userId: number, filters: Filters) {
  // Build unique cache key per user and filter combination
  const cacheKey = ["getCachedWorkflowsFilteredList", String(userId), JSON.stringify(filters)] as const;

  const cached = unstable_cache(
    async () => {
      return await WorkflowRepository.getFilteredList({ userId, input: { filters } });
    },
    cacheKey,
    {
      revalidate: NEXTJS_CACHE_TTL,
      tags: [CACHE_TAGS.WORKFLOWS_LIST],
    }
  );

  return cached();
}

export async function revalidateWorkflowsList() {
  revalidateTag(CACHE_TAGS.WORKFLOWS_LIST);
}
