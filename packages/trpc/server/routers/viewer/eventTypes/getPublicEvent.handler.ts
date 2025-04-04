import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TEventInputSchema } from "./getPublicEvent.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TEventInputSchema;
};

export const getPublicEventHandler = async ({ ctx, input }: GetOptions) => {
  return await EventTypeRepository.getPublicEvent(input, ctx.user.id);
};
