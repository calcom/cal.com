import { getUserAvailability } from "@calcom/lib/getUserAvailability";

import type { TrpcSessionUser } from "../../../types";
import type { TUserInputSchema } from "./user.schema";

type UserOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUserInputSchema;
};

export const userHandler = async ({ input, ctx }: UserOptions) => {
  let isOverlayUser = false;
  if ("username" in ctx.user && input.username === ctx.user.username) {
    isOverlayUser = true;
  }
  return getUserAvailability(
    { returnDateOverrides: true, bypassBusyCalendarTimes: false, ...input },
    undefined,
    isOverlayUser
  );
};
