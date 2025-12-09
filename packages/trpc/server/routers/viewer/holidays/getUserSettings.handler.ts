import { getHolidayService } from "@calcom/lib/holidays";
import { HolidayRepository } from "@calcom/lib/server/repository/HolidayRepository";
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

  const settings = await HolidayRepository.findUserSettingsSelect({
    userId,
    select: {
      countryCode: true,
      disabledIds: true,
    },
  });

  if (!settings || !settings.countryCode) {
    return {
      countryCode: null,
      holidays: [],
    };
  }

  const holidayService = getHolidayService();
  const holidays = await holidayService.getHolidaysWithStatus(settings.countryCode, settings.disabledIds);

  return {
    countryCode: settings.countryCode,
    holidays,
  };
}

export default getUserSettingsHandler;
