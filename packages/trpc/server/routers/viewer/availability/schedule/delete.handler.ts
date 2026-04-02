import { HostRepository } from "@calcom/features/host/repositories/HostRepository";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ input, ctx }: DeleteOptions) => {
  const { user } = ctx;
  const hostRepo = new HostRepository(prisma);

  const scheduleToDelete = await prisma.schedule.findUnique({
    where: {
      id: input.scheduleId,
    },
    select: {
      userId: true,
    },
  });

  if (scheduleToDelete?.userId !== user.id) throw new TRPCError({ code: "UNAUTHORIZED" });

  // cannot remove this schedule if this is the last schedule remaining
  // if this is the last remaining schedule of the user then this would be the default schedule and so cannot remove it
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

    // to throw the error if there arent any other schedules
    if (!scheduleToSetAsDefault) throw new TRPCError({ code: "BAD_REQUEST" });

    await hostRepo.updateHostsSchedule(user.id, input.scheduleId, scheduleToSetAsDefault.id);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        defaultScheduleId: scheduleToSetAsDefault?.id || null,
      },
    });
  } else if (user.defaultScheduleId) {
    await hostRepo.updateHostsSchedule(user.id, input.scheduleId, user.defaultScheduleId);
  }

  await prisma.schedule.delete({
    where: {
      id: input.scheduleId,
    },
  });
};
