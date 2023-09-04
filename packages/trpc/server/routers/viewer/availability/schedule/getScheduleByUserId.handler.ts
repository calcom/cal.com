import { DEFAULT_SCHEDULE } from "@calcom/lib/availability";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import { getHandler } from "./get.handler";
import type { TGetByUserIdInputSchema } from "./getScheduleByUserId.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetByUserIdInputSchema;
};

export const getScheduleByUserIdHandler = async ({ ctx, input }: GetOptions) => {
  const foundUserDefaultId = await prisma.user.findUnique({
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
      throw new TRPCError({
        code: "NOT_FOUND",
      });
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

    console.log({ schedule });
  } catch (e) {
    console.log("error", e);
    return {
      id: -1,
      name: "Working Hourse",
      availability: DEFAULT_SCHEDULE,
      dateOverrides: [],
      timeZone: ctx.user.timeZone || "Europe/London",
      workingHours: [],
      isDefault: true,
      hasDefaultSchedule: false, // This is the path that we take if the user has not completed onboarding
    };
  }
};
