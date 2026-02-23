import { getHolidayService } from "@calcom/lib/holidays";
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
  const holidayService = getHolidayService();

  try {
    return await holidayService.toggleHoliday(ctx.user.id, input.holidayId, input.enabled);
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to toggle holiday",
    });
  }
}

export default toggleHolidayHandler;
