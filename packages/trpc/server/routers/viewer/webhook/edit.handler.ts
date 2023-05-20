import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TEditInputSchema } from "./edit.schema";

type EditOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TEditInputSchema;
};

export const editHandler = async ({ ctx, input }: EditOptions) => {
  const { id, ...data } = input;
  const webhook = input.eventTypeId
    ? await prisma.webhook.findFirst({
        where: {
          eventTypeId: input.eventTypeId,
          id,
        },
      })
    : await prisma.webhook.findFirst({
        where: {
          userId: ctx.user.id,
          id,
        },
      });
  if (!webhook) {
    // user does not own this webhook
    // team event doesn't own this webhook
    return null;
  }
  return await prisma.webhook.update({
    where: {
      id,
    },
    data,
  });
};
