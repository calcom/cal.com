import { getHolidayService } from "@calcom/lib/holidays";
import { HolidayRepository } from "@calcom/lib/server/repository/HolidayRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TUpdateSettingsSchema } from "./updateSettings.schema";

type UpdateSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateSettingsSchema;
};

export async function updateSettingsHandler({ ctx, input }: UpdateSettingsOptions) {
  const userId = ctx.user.id;
  const { countryCode, resetDisabledHolidays } = input;

  const holidayService = getHolidayService();

  if (countryCode) {
    const countries = holidayService.getSupportedCountries();
    const isValidCountry = countries.some((c) => c.code === countryCode);
    if (!isValidCountry) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid country code",
      });
    }
  }

  const settings = await HolidayRepository.upsertUserSettings({
    userId,
    countryCode: countryCode ?? null,
    resetDisabledHolidays,
  });

  if (settings.countryCode) {
    const holidays = await holidayService.getHolidaysWithStatus(settings.countryCode, settings.disabledIds);
    return {
      countryCode: settings.countryCode,
      holidays,
    };
  }

  return {
    countryCode: null,
    holidays: [],
  };
}

export default updateSettingsHandler;
