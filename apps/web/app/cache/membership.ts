"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";

const CACHE_TAGS = {
  HAS_TEAM_PLAN: "MembershipRepository.findFirstAcceptedMembershipByUserId",
} as const;

export const getCachedHasTeamPlan = unstable_cache(
  async (userId: number) => {
    const hasTeamPlan = await MembershipRepository.findFirstAcceptedMembershipByUserId(userId);

    return { hasTeamPlan: !!hasTeamPlan };
  },
  ["getCachedHasTeamPlan"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.HAS_TEAM_PLAN],
  }
);

export const revalidateHasTeamPlan = async () => {
  revalidateTag(CACHE_TAGS.HAS_TEAM_PLAN);
};
