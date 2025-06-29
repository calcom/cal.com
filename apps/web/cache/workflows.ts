"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";

const CACHE_TAGS = {
  WORKFLOWS_LIST: "WorkflowRepository.filteredList",
  WORKFLOW_BY_ID: "WorkflowRepository.getById",
  VERIFIED_NUMBERS: "WorkflowRepository.getVerifiedNumbers",
  VERIFIED_EMAILS: "WorkflowRepository.getVerifiedEmails",
  ENRICHED_USER: "UserRepository.enrichUserWithTheProfile",
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

export const getCachedWorkflowById = unstable_cache(
  async (id: number) => {
    return await WorkflowRepository.getById({ id });
  },
  ["getCachedWorkflowById"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.WORKFLOW_BY_ID],
  }
);

export const getCachedWorkflowVerifiedNumber = unstable_cache(
  async (teamId: number, userId: number) => {
    return await WorkflowRepository.getVerifiedNumbers({ teamId, userId });
  },
  ["getCachedWorkflowVerifiedNumber"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.VERIFIED_NUMBERS],
  }
);
export const getCachedWorkflowVerifiedEmails = unstable_cache(
  async (userEmail: string, userId: number, teamId?: number) => {
    return await WorkflowRepository.getVerifiedEmails({ userEmail, userId, teamId });
  },
  ["getCachedWorkflowVerifiedEmails"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.VERIFIED_EMAILS],
  }
);

export const getCachedUser = unstable_cache(
  async (user: any, upId: string) => {
    return await UserRepository.enrichUserWithTheProfile({ user, upId });
  },
  ["getCachedUser"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.ENRICHED_USER],
  }
);

export async function revalidateWorkflowById() {
  revalidateTag(CACHE_TAGS.WORKFLOW_BY_ID);
}
export async function revalidateWorkflowVerifiedNumbers() {
  revalidateTag(CACHE_TAGS.VERIFIED_NUMBERS);
}
