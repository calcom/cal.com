import { getUserAvailability } from "@calcom/core/getUserAvailability";

import type { TUserInputSchema } from "./user.schema";

type UserOptions = {
  ctx: Record<string, unknown>;
  input: TUserInputSchema;
};

export const userHandler = async ({ input }: UserOptions) => {
  return getUserAvailability(input);
};
