"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";

const CACHE_TAGS = {
  WORKFLOWS_LIST: "WorkflowRepository.filteredList",
} as const;

export const getCachedWorkflowsFilteredList = unstable_cache(
  async (userId: number, filters: any) => {
    return await WorkflowRepository.getFilteredList({ userId, input: { filters } });
  },
  ["getCachedWorkflowsFilteredList"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.WORKFLOWS_LIST],
  }
);

export async function revalidateWorkflowsList() {
  revalidateTag(CACHE_TAGS.WORKFLOWS_LIST);
}
