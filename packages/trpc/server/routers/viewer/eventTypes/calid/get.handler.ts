import { getEventTypeByIdForCalIdTeam } from "@calcom/lib/event-types/getEventTypeById";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TCalIdGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCalIdGetInputSchema;
};

export const getHandler = ({ ctx, input }: GetOptions) => {
  return getEventTypeByIdForCalIdTeam({
    eventTypeId: input.id,
    calIdTeamId: input.calIdTeamId,
    prisma: ctx.prisma,
    isTrpcCall: true,
  });
};
