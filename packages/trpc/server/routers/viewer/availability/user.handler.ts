import { findUsersForAvailabilityCheck } from "@calcom/features/availability/lib/findUsersForAvailabilityCheck";
import { getUserAvailabilityService } from "@calcom/features/di/containers/GetUserAvailability";
import type { TrpcSessionUser } from "../../../types";
import type { TUserInputSchema } from "./user.schema";

type UserOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUserInputSchema;
};

function getUser(username: string) {
  return findUsersForAvailabilityCheck({
    where: {
      username,
    },
  });
}

export const userHandler = async ({ input }: UserOptions) => {
  const userAvailabilityService = getUserAvailabilityService();
  const user = await getUser(input.username);
  return userAvailabilityService.getUserAvailability(
    { returnDateOverrides: true, bypassBusyCalendarTimes: false, ...input },
    {
      user,
    }
  );
};
