import { TRPCError } from "@trpc/server";

import { HolidayService } from "@calcom/lib/holidays";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TToggleHolidaySchema } from "./toggleHoliday.schema";

type ToggleHolidayOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TToggleHolidaySchema;
};

export async function toggleHolidayHandler({ ctx, input }: ToggleHolidayOptions) {
  const userId = ctx.user.id;
  const { holidayId, enabled } = input;

  const settings = await prisma.userHolidaySettings.findUnique({
    where: { userId },
  });

  if (!settings || !settings.countryCode) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No holiday country selected",
    });
  }

  const holidays = await HolidayService.getHolidaysForCountry(settings.countryCode);
  const holidayExists = holidays.some((h) => h.id === holidayId);

  if (!holidayExists) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Holiday not found for this country",
    });
  }

  let disabledIds = [...settings.disabledIds];

  if (enabled) {
    disabledIds = disabledIds.filter((id) => id !== holidayId);
  } else {
    if (!disabledIds.includes(holidayId)) {
      disabledIds.push(holidayId);
    }
  }

  await prisma.userHolidaySettings.update({
    where: { userId },
    data: { disabledIds },
  });

  const updatedHolidays = await HolidayService.getHolidaysWithStatus(settings.countryCode, disabledIds);

  return {
    countryCode: settings.countryCode,
    holidays: updatedHolidays,
  };
}

export default toggleHolidayHandler;
