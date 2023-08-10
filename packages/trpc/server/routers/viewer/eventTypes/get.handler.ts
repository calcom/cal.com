import getEventTypeById from "@calcom/lib/getEventTypeById";
import type { PrismaType } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaType;
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
