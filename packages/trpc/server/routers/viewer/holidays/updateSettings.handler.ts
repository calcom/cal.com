import { HolidayService } from "@calcom/lib/holidays";
import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "@calcom/trpc/server/types";
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

  // Validate country code if provided
  if (countryCode) {
    const countries = HolidayService.getSupportedCountries();
    const isValidCountry = countries.some((c) => c.code === countryCode);
    if (!isValidCountry) {
      throw new Error("Invalid country code");
    }
  }

  // Upsert settings
  const settings = await prisma.userHolidaySettings.upsert({
    where: { userId },
    create: {
      userId,
      countryCode,
      disabledIds: [],
    },
    update: {
      countryCode,
      // Reset disabled holidays when changing country if requested
      ...(resetDisabledHolidays ? { disabledIds: [] } : {}),
    },
  });

  // Return updated holidays if country is set
  if (settings.countryCode) {
    const holidays = HolidayService.getHolidaysWithStatus(settings.countryCode, settings.disabledIds);
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

