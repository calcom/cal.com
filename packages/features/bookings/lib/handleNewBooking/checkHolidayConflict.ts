import type { Logger } from "tslog";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { getHolidayService } from "@calcom/lib/holidays";
import { HttpError } from "@calcom/lib/http-error";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { HolidayRepository } from "@calcom/lib/server/repository/HolidayRepository";

export interface HolidayConflictResult {
  hasConflict: boolean;
  holidayName?: string;
}

/**
 * Checks if a booking time conflicts with an enabled holiday for a user.
 *
 * @param userId - The ID of the host user to check holidays for
 * @param startTime - The start time of the booking
 * @returns HolidayConflictResult with conflict status and holiday name if found
 */
const _checkHolidayConflict = async ({
  userId,
  startTime,
}: {
  userId: number;
  startTime: Date;
}): Promise<HolidayConflictResult> => {
  // Fetch user's holiday settings using repository pattern
  const holidaySettings = await HolidayRepository.findUserSettingsSelect({
    userId,
    select: { countryCode: true, disabledIds: true },
  });

  // No holidays configured for this user
  if (!holidaySettings?.countryCode) {
    return { hasConflict: false };
  }

  const holidayService = getHolidayService();

  // Check if booking start date falls on an enabled holiday
  const holiday = await holidayService.getHolidayOnDate(
    startTime,
    holidaySettings.countryCode,
    holidaySettings.disabledIds
  );

  if (holiday) {
    return {
      hasConflict: true,
      holidayName: holiday.name,
    };
  }

  return { hasConflict: false };
};

export const checkHolidayConflict = withReporting(_checkHolidayConflict, "checkHolidayConflict");

/**
 * Validates that a booking does not fall on an enabled holiday for any of the specified users.
 * Throws an error if a holiday conflict is found.
 *
 * @param userIds - Array of user IDs to check holidays for
 * @param startTime - The start time of the booking
 * @param loggerWithEventDetails - Logger for debugging
 * @throws Error with BookingOnHoliday code if booking falls on a holiday
 */
const _ensureNoHolidayConflict = async ({
  userIds,
  startTime,
  loggerWithEventDetails,
}: {
  userIds: number[];
  startTime: Date;
  loggerWithEventDetails?: Logger<unknown>;
}): Promise<void> => {
  // Check all users in parallel, log conflicts as they are detected
  const results = await Promise.all(
    userIds.map(async (userId) => {
      const result = await _checkHolidayConflict({ userId, startTime });

      if (result.hasConflict) {
        loggerWithEventDetails?.error(
          `Booking rejected: Date ${startTime.toISOString()} falls on holiday "${
            result.holidayName
          }" for user ${userId}`
        );
      }

      return result;
    })
  );

  // After all checks complete, throw if any conflict was found
  const conflict = results.find((result) => result.hasConflict);
  if (conflict) {
    throw new HttpError({
      statusCode: 400,
      message: ErrorCode.BookingOnHoliday,
      data: { holidayName: conflict.holidayName },
    });
  }
};

export const ensureNoHolidayConflict = withReporting(_ensureNoHolidayConflict, "ensureNoHolidayConflict");
