"use server";

import { revalidateTag } from "next/cache";

import { TravelScheduleRepository } from "@calcom/features/schedules/repositories/travelSchedule";
import { NEXTJS_CACHE_TTL } from "@calcom/lib/constants";
import { unstable_cache } from "@calcom/lib/unstable_cache";

const CACHE_TAGS = {
  TRAVEL_SCHEDULES: "TravelRepository.findTravelSchedulesByUserId",
} as const;

export const getTravelSchedule = unstable_cache(
  async (userId: number) => {
    return await TravelScheduleRepository.findTravelSchedulesByUserId(userId);
  },
  ["getTravelSchedule"],
  {
    revalidate: NEXTJS_CACHE_TTL,
    tags: [CACHE_TAGS.TRAVEL_SCHEDULES],
  }
);

export const revalidateTravelSchedules = async () => {
  revalidateTag(CACHE_TAGS.TRAVEL_SCHEDULES);
};
