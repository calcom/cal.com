import { handleScheduleUpdatedWebhook } from "@calcom/features/webhooks/lib/handleScheduleUpdatedWebhook";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import { updateHostsWithNewDefaultSchedule } from "../util";
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
      id: true,
      name: true,
      timeZone: true,
      availability: true,
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

    await updateHostsWithNewDefaultSchedule(user.id, input.scheduleId, scheduleToSetAsDefault.id);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        defaultScheduleId: scheduleToSetAsDefault?.id || null,
      },
    });
  } else if (user.defaultScheduleId) {
    await updateHostsWithNewDefaultSchedule(user.id, input.scheduleId, user.defaultScheduleId);
  }

  const prevAvailability = scheduleToDelete.availability.map((avail) => ({
    days: avail.days,
    startTime: avail.startTime.toISOString(),
    endTime: avail.endTime.toISOString(),
  }));

  await prisma.schedule.delete({
    where: {
      id: input.scheduleId,
    },
  });

  const [{ teams }, orgId] = await Promise.all([
    UserRepository.findTeamsByUserId({ userId: user.id }),
    getOrgIdFromMemberOrTeamId({ memberId: user.id }),
  ]);

  const scheduleData = {
    id: scheduleToDelete.id,
    userId: user.id,
    teamId: teams.map((team) => team.id),
    orgId: orgId,
    name: scheduleToDelete.name,
    timeZone: scheduleToDelete.timeZone,
    event: "Schedule Deleted",
  };

  await handleScheduleUpdatedWebhook({
    schedule: scheduleData,
    prevAvailability,
    newAvailability: [],
  });
};
