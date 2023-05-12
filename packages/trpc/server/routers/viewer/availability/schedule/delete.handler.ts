import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ input, ctx }: DeleteOptions) => {
  const { user } = ctx;

  const scheduleToDelete = await prisma.schedule.findFirst({
    where: {
      id: input.scheduleId,
    },
    select: {
      userId: true,
    },
  });

  if (scheduleToDelete?.userId !== user.id) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (user.defaultScheduleId === input.scheduleId) {
    // set a new default or unset default if no other schedule
    const scheduleToSetAsDefault = await prisma.schedule.findFirst({
      where: {
        userId: user.id,
        NOT: {
          id: input.scheduleId,
        },
      },
      select: {
        id: true,
      },
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        defaultScheduleId: scheduleToSetAsDefault?.id || null,
      },
    });
  }
  await prisma.schedule.delete({
    where: {
      id: input.scheduleId,
    },
  });
};
