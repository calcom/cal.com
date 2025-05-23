import type { Session } from "next-auth";

import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type GetUserTimePreferencesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const getUserTimePreferencesHandler = async ({ ctx }: GetUserTimePreferencesOptions) => {
  const { user } = ctx;

  return {
    timeFormat: user.timeFormat ?? 12,
    timeZone: user.timeZone,
  };
};
