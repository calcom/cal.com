import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;

  const andCondition: Partial<{ id: string; eventTypeId: number; teamId: number; userId: number }>[] = [
    { id: id },
  ];

  if (input.eventTypeId) {
    andCondition.push({ eventTypeId: input.eventTypeId });
  } else if (input.teamId) {
    andCondition.push({ teamId: input.teamId });
  } else {
    andCondition.push({ userId: ctx.user.id });
  }

  const webhookToDelete = await prisma.webhook.findFirst({
    where: {
      AND: andCondition,
    },
  });

  if (webhookToDelete) {
    await prisma.webhook.delete({
      where: {
        id: webhookToDelete.id,
      },
    });
  }

  return {
    id,
  };
};
