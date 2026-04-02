import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../../types";
import { getHandler } from "./get.handler";
import type { TGetByUserIdInputSchema } from "./getScheduleByUserId.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetByUserIdInputSchema;
};

const EMPTY_SCHEDULE = [[], [], [], [], [], [], []];

export const getScheduleByUserIdHandler = async ({ ctx, input }: GetOptions) => {
  const foundUserDefaultId = await ctx.prisma.user.findUnique({
    where: {
      id: input.userId,
    },
    select: {
      defaultScheduleId: true,
    },
  });

  try {
    // This looks kinda weird that we throw straight in the catch - its so that we can return a default schedule if the user has not completed onboarding @shiraz will loveme for this
    if (!foundUserDefaultId?.defaultScheduleId) {
      throw new Error("NOT_FOUND");
    }
    const schedule = await getHandler({
      ctx,
      input: {
        scheduleId: foundUserDefaultId?.defaultScheduleId,
      },
    });

    return {
      ...schedule,
      hasDefaultSchedule: true,
    };
  } catch (e) {
    return {
      id: -1,
      name: "Working Hourse",
      availability: EMPTY_SCHEDULE,
      dateOverrides: [],
      timeZone: ctx.user.timeZone || "Europe/London",
      workingHours: [],
      isDefault: true,
      hasDefaultSchedule: false, // This is the path that we take if the user has not completed onboarding
    };
  }
};
