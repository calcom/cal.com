import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx: _ctx, input }: GetOptions) => {
  return await prisma.webhook.findUniqueOrThrow({
    where: {
      id: input.webhookId,
    },
    select: {
      id: true,
      subscriberUrl: true,
      payloadTemplate: true,
      active: true,
      eventTriggers: true,
      secret: true,
    },
  });
};
