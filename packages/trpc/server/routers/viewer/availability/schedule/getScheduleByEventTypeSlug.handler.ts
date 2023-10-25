import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../trpc";
import { getHandler } from "./get.handler";
import type { TGetByEventSlugInputSchema } from "./getScheduleByEventTypeSlug.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetByEventSlugInputSchema;
};

const EMPTY_SCHEDULE = [[], [], [], [], [], [], []];

export const getScheduleByEventSlugHandler = async ({ ctx, input }: GetOptions) => {
  const foundScheduleForSlug = await ctx.prisma.eventType.findFirst({
    where: {
      slug: input.eventSlug,
      userId: ctx.user.id,
    },
    select: {
      scheduleId: true,
    },
  });

  try {
    // This looks kinda weird that we throw straight in the catch - its so that we can return a default schedule if the user has not completed onboarding @shiraz will loveme for this
    if (!foundScheduleForSlug?.scheduleId) {
      throw new Error("NOT_FOUND");
    }
    return await getHandler({
      ctx,
      input: {
        scheduleId: foundScheduleForSlug?.scheduleId,
      },
    });
  } catch (e) {
    return {
      id: -1,
      name: "No schedules found",
      availability: EMPTY_SCHEDULE,
      dateOverrides: [],
      timeZone: ctx.user.timeZone || "Europe/London",
      workingHours: [],
      isDefault: true,
      hasDefaultSchedule: false, // This is the path that we take if the user has not completed onboarding
    };
  }
};
