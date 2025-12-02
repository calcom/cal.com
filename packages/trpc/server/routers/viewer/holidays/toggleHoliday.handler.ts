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

  // Get current settings
  const settings = await prisma.userHolidaySettings.findUnique({
    where: { userId },
  });

  if (!settings || !settings.countryCode) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No holiday country selected",
    });
  }

  // Verify holiday exists for this country
  const holidays = HolidayService.getHolidaysForCountry(settings.countryCode);
  const holidayExists = holidays.some((h) => h.id === holidayId);

  if (!holidayExists) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Holiday not found for this country",
    });
  }

  // Update disabled list
  let disabledIds = [...settings.disabledIds];

  if (enabled) {
    // Remove from disabled list (enable the holiday)
    disabledIds = disabledIds.filter((id) => id !== holidayId);
  } else {
    // Add to disabled list (disable the holiday)
    if (!disabledIds.includes(holidayId)) {
      disabledIds.push(holidayId);
    }
  }

  // Save updated settings
  await prisma.userHolidaySettings.update({
    where: { userId },
    data: { disabledIds },
  });

  // Return updated holidays
  const updatedHolidays = HolidayService.getHolidaysWithStatus(settings.countryCode, disabledIds);

  return {
    countryCode: settings.countryCode,
    holidays: updatedHolidays,
  };
}

