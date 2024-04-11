import { getUserAvailability } from "@calcom/core/getUserAvailability";

import type { TrpcSessionUser } from "../../../trpc";
import type { TUserInputSchema } from "./user.schema";

type UserOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUserInputSchema;
};

export const userHandler = async ({ input, ctx }: UserOptions) => {
  let overlayUserType: "overlay" | "cal" | undefined;
  if ("username" in ctx.user && input.username === ctx.user.username) {
    overlayUserType = "cal";
  }
  return getUserAvailability({ returnDateOverrides: true, ...input }, undefined, overlayUserType);
};
