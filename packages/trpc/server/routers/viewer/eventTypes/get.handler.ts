import getEventTypeById from "@calcom/lib/getEventTypeById";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetInputSchema } from "./get.schema";
import type { PrismaClient } from ".prisma/client";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetInputSchema;
};

export const getHandler = ({ ctx, input }: GetOptions) => {
  return getEventTypeById({
    eventTypeId: input.id,
    userId: ctx.user.id,
    prisma: ctx.prisma,
    isTrpcCall: true,
  });
};
