import { getUserAvailability } from "@calcom/lib/getUserAvailability";

import type { TrpcSessionUser } from "../../../types";
import type { TUserInputSchema } from "./user.schema";

type UserOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUserInputSchema;
};

export const userHandler = async ({ input }: UserOptions) => {
  return getUserAvailability(
    { returnDateOverrides: true, bypassBusyCalendarTimes: false, ...input },
    undefined
  );
};
