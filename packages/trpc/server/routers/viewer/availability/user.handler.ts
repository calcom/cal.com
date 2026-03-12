import { findUsersForAvailabilityCheck } from "@calcom/features/availability/lib/findUsersForAvailabilityCheck";
import { getUserAvailabilityService } from "@calcom/features/di/containers/GetUserAvailability";
import { TRPCError } from "@trpc/server";
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
  if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  return userAvailabilityService.getUserAvailabilityIncludingBusyTimesFromLimits(
    { returnDateOverrides: true, bypassBusyCalendarTimes: false, ...input },
    {
      user,
    }
  );
};
