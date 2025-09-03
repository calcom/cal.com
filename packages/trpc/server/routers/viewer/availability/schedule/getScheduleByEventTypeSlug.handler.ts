import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
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
  const foundScheduleForSlug = await ctx.prisma.eventType.findUnique({
    where: {
      userId_slug: {
        userId: ctx.user.id,
        slug: input.eventSlug,
      },
    },
    select: {
      scheduleId: true,
    },
  });

  try {
    // This looks kinda weird that we throw straight in the catch - its so that we can return a default schedule if the user has not completed onboarding @shiraz will loveme for this
    if (!foundScheduleForSlug?.scheduleId) {
      const foundUserDefaultId = await ctx.prisma.user.findUnique({
        where: {
          id: ctx.user.id,
        },
        select: {
          defaultScheduleId: true,
        },
      });

      if (foundUserDefaultId?.defaultScheduleId) {
        return await getHandler({
          ctx,
          input: {
            scheduleId: foundUserDefaultId?.defaultScheduleId,
          },
        });
      }

      throw new Error("NOT_FOUND");
    }
    return await getHandler({
      ctx,
      input: {
        scheduleId: foundScheduleForSlug?.scheduleId,
      },
    });
  } catch (e) {
    console.log(e);
    return {
      id: -1,
      name: "No schedules found",
      availability: EMPTY_SCHEDULE,
      dateOverrides: [],
      timeZone: ctx.user.timeZone || "Europe/London",
      workingHours: [],
      isDefault: true,
    };
  }
};
