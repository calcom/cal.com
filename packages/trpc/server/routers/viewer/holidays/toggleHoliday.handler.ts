import { getHolidayService } from "@calcom/lib/holidays";
import { HolidayRepository } from "@calcom/lib/server/repository/HolidayRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TToggleHolidaySchema } from "./toggleHoliday.schema";

type ToggleHolidayOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TToggleHolidaySchema;
};

/**
 * Toggle a holiday on/off for a user.
 *
 * Note: holidayId is the Google Calendar event ID (eventId from HolidayCache),
 * NOT the database id. This is stored in UserHolidaySettings.disabledIds[]
 * to track which holidays the user has disabled.
 */
export async function toggleHolidayHandler({ ctx, input }: ToggleHolidayOptions) {
  const userId = ctx.user.id;
  const { holidayId, enabled } = input;

  const settings = await HolidayRepository.findUserSettingsSelect({
    userId,
    select: {
      countryCode: true,
      disabledIds: true,
    },
  });

  if (!settings || !settings.countryCode) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No holiday country selected",
    });
  }

  const holidayService = getHolidayService();
  const holidays = await holidayService.getHolidaysForCountry(settings.countryCode);
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

  await HolidayRepository.updateDisabledIds({ userId, disabledIds });

  const updatedHolidays = await holidayService.getHolidaysWithStatus(settings.countryCode, disabledIds);

  return {
    countryCode: settings.countryCode,
    holidays: updatedHolidays,
  };
}

export default toggleHolidayHandler;
