import { handleScheduleUpdatedWebhook } from "@calcom/features/webhooks/lib/handleScheduleUpdatedWebhook";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { user } = ctx;
  if (input.eventTypeId) {
    const eventType = await prisma.eventType.findUnique({
      where: {
        id: input.eventTypeId,
      },
      select: {
        userId: true,
      },
    });
    if (!eventType || eventType.userId !== user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not authorized to create a schedule for this event type",
      });
    }
  }
  const data: Prisma.ScheduleCreateInput = {
    name: input.name,
    user: {
      connect: {
        id: user.id,
      },
    },
    // If an eventTypeId is provided then connect the new schedule to that event type
    ...(input.eventTypeId && { eventType: { connect: { id: input.eventTypeId } } }),
  };

  const availability = getAvailabilityFromSchedule(input.schedule || DEFAULT_SCHEDULE);
  data.availability = {
    createMany: {
      data: availability.map((schedule) => ({
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    },
  };

  data.timeZone = user.timeZone;

  const schedule = await prisma.schedule.create({
    data,
    include: {
      availability: true,
    },
  });

  if (!user.defaultScheduleId) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        defaultScheduleId: schedule.id,
      },
    });
  }

  const [{ teams }, orgId] = await Promise.all([
    UserRepository.findTeamsByUserId({ userId: user.id }),
    getOrgIdFromMemberOrTeamId({ memberId: user.id }),
  ]);

  const scheduleData = {
    id: schedule.id,
    userId: user.id,
    teamId: teams.map((team) => team.id),
    orgId: orgId,
    name: schedule.name,
    timeZone: schedule.timeZone,
    event: "Schedule Created",
  };

  const newAvailability = schedule.availability.map((avail) => ({
    days: avail.days,
    startTime: avail.startTime.toISOString(),
    endTime: avail.endTime.toISOString(),
    date: avail.date?.toISOString(),
  }));

  await handleScheduleUpdatedWebhook({
    schedule: scheduleData,
    newAvailability,
  });

  return { schedule };
};
