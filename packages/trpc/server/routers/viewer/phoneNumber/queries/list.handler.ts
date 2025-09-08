import { PrismaPhoneNumberRepository } from "@calcom/lib/server/repository/PrismaPhoneNumberRepository";

import type { TrpcSessionUser } from "../../../types";
import type { TListInputSchema } from "./list.schema";

type ListHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListInputSchema;
};

export const listHandler = async ({ ctx, input }: ListHandlerOptions) => {
  return await PrismaPhoneNumberRepository.findManyWithUserAccess({
    userId: ctx.user.id,
    teamId: input?.teamId,
    scope: input?.scope || "all",
  });
};
