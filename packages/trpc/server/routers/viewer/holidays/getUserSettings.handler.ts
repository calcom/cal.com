import { HolidayService } from "@calcom/lib/holidays";
import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TGetUserSettingsSchema } from "./getUserSettings.schema";

type GetUserSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetUserSettingsSchema;
};

export async function getUserSettingsHandler({ ctx }: GetUserSettingsOptions) {
  const userId = ctx.user.id;

  // Get user's holiday settings
  const settings = await prisma.userHolidaySettings.findUnique({
    where: { userId },
  });

  if (!settings || !settings.countryCode) {
    return {
      countryCode: null,
      holidays: [],
    };
  }

  // Get holidays with enabled status
  const holidays = HolidayService.getHolidaysWithStatus(settings.countryCode, settings.disabledIds);

  return {
    countryCode: settings.countryCode,
    holidays,
  };
}

