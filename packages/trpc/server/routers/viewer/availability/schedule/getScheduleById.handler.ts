import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../trpc";
import { getHandler } from "./get.handler";
import type { TGetByIdInputSchema } from "./getScheduleById.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetByIdInputSchema;
};

const EMPTY_SCHEDULE = [[], [], [], [], [], [], []];

export const getScheduleByIdHandler = async ({ ctx, input }: GetOptions) => {
  try {
    // This looks kinda weird that we throw straight in the catch - its so that we can return a default schedule if the user has not completed onboarding @shiraz will loveme for this
    return await getHandler({
      ctx,
      input: {
        scheduleId: input.id,
      },
    });
  } catch (e) {
    return {
      id: -1,
      name: "Working Hourse",
      availability: EMPTY_SCHEDULE,
      dateOverrides: [],
      timeZone: ctx.user.timeZone || "Europe/London",
      workingHours: [],
      isDefault: true,
      eventType: [],
      hasDefaultSchedule: false, // This is the path that we take if the user has not completed onboarding
    };
  }
};
