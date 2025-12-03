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

  const settings = await prisma.userHolidaySettings.findUnique({
    where: { userId },
  });

  if (!settings || !settings.countryCode) {
    return {
      countryCode: null,
      holidays: [],
    };
  }

  const holidays = await HolidayService.getHolidaysWithStatus(settings.countryCode, settings.disabledIds);

  return {
    countryCode: settings.countryCode,
    holidays,
  };
}

export default getUserSettingsHandler;
