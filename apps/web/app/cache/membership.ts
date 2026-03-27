"use server";

import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { updateTag, unstable_cache } from "next/cache";

const CACHE_TAGS = {
  HAS_TEAM_PLAN: "MembershipRepository.hasAnyAcceptedMembershipByUserId",
} as const;

export const getCachedHasTeamPlan = unstable_cache(
  async (userId: number) => {
    const membershipRepository = getMembershipRepository();
    const hasTeamPlan = await membershipRepository.hasAnyAcceptedMembershipByUserId(userId);

    return { hasTeamPlan: !!hasTeamPlan };
  },
  ["getCachedHasTeamPlan"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.HAS_TEAM_PLAN],
  }
);

export const revalidateHasTeamPlan = async () => {
  updateTag(CACHE_TAGS.HAS_TEAM_PLAN);
};
