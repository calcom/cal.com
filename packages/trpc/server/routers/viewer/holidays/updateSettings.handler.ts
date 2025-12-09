import { getHolidayService } from "@calcom/lib/holidays";
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
  const holidayService = getHolidayService();

  try {
    return await holidayService.updateSettings(
      ctx.user.id,
      input.countryCode ?? null,
      input.resetDisabledHolidays
    );
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Failed to update settings",
    });
  }
}

export default updateSettingsHandler;
