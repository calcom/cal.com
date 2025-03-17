import { TravelScheduleRepository } from "@calcom/lib/server/repository/travelSchedule";

import type { TrpcSessionUser } from "../../../trpc";

type GetTravelSchedulesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getTravelSchedulesHandler = async ({ ctx }: GetTravelSchedulesOptions) => {
  return await TravelScheduleRepository.findTravelSchedulesByUserId(ctx.user.id);
};
