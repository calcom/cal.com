import { getUserAvailabilityService } from "@calcom/lib/di/containers/get-user-availability";

import type { TrpcSessionUser } from "../../../types";
import type { TUserInputSchema } from "./user.schema";

type UserOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUserInputSchema;
};

export const userHandler = async ({ input }: UserOptions) => {
  const userAvailabilityService = getUserAvailabilityService()
  return userAvailabilityService.getUserAvailability(
    { returnDateOverrides: true, bypassBusyCalendarTimes: false, ...input },
    undefined
  );
};
