import { HolidayService } from "@calcom/lib/holidays";
import prisma from "@calcom/prisma";
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

  if (countryCode) {
    const countries = HolidayService.getSupportedCountries();
    const isValidCountry = countries.some((c) => c.code === countryCode);
    if (!isValidCountry) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid country code",
      });
    }
  }

  const settings = await prisma.userHolidaySettings.upsert({
    where: { userId },
    create: {
      userId,
      countryCode,
      disabledIds: [],
    },
    update: {
      countryCode,
      ...(resetDisabledHolidays ? { disabledIds: [] } : {}),
    },
    select: {
      countryCode: true,
      disabledIds: true,
    },
  });

  if (settings.countryCode) {
    const holidays = await HolidayService.getHolidaysWithStatus(settings.countryCode, settings.disabledIds);
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
