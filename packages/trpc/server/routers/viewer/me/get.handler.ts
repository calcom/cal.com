import type { Session } from "next-auth";

import { UserRepository } from "@calcom/lib/server/repository/user";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TGetInputSchema } from "./get.schema";

type MeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: MeOptions) => {
  return UserRepository.getUserWithDetails({
    user: ctx.user,
    session: ctx.session,
    includePasswordAdded: input?.includePasswordAdded,
  });
};
