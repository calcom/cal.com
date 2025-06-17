import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { mergeOverlappingRanges } from "@calcom/lib/date-ranges";

export interface RestrictionScheduleAvailability {
  days: number[];
  startTime: Date;
  endTime: Date;
  date: Date | null;
}

export interface RestrictionSchedule {
  id: number;
  timeZone: string | null;
  availability: RestrictionScheduleAvailability[];
}

export interface RestrictionScheduleCheckParams {
  restrictionSchedule: RestrictionSchedule;
  bookingStartTime: Dayjs;
  bookingEndTime: Dayjs;
  useBookerTimezone: boolean;
  bookerTimezone?: string;
}

/**
 * Checks if the restriction schedule feature is enabled for a team
 * @param teamId - The team ID to check
 * @returns Promise<boolean> - True if the feature is enabled, false otherwise
 */
export async function isRestrictionScheduleEnabled(teamId?: number): Promise<boolean> {
  if (!teamId) {
    return false; // Personal events don't have restriction schedules
  }

  const featureRepo = new FeaturesRepository();
  return await featureRepo.checkIfTeamHasFeature(teamId, "restriction-schedule");
}
/**
 * Checks if a booking time falls within the restriction schedule's availability
 * @param params - The restriction schedule check parameters
 * @returns true if the booking is allowed, false otherwise
 * @throws Error if required timezone information is missing
 */
export function isBookingAllowedByRestrictionSchedule({
  restrictionSchedule,
  bookingStartTime,
  bookingEndTime,
  useBookerTimezone,
  bookerTimezone,
}: RestrictionScheduleCheckParams): boolean {
  if (!restrictionSchedule.timeZone && !useBookerTimezone) {
    throw new Error("No timezone is set for the restriction schedule and useBookerTimezone is false");
  }

  if (useBookerTimezone && !bookerTimezone) {
    throw new Error("Booker timezone is required when useBookerTimezone is true");
  }

  const restrictionTimezone = useBookerTimezone ? bookerTimezone! : restrictionSchedule.timeZone!;

  const dateOverrides = restrictionSchedule.availability.filter((a) => !!a.date);
  const recurringRules = restrictionSchedule.availability.filter((a) => !a.date);

  const bookingStartTimeNormalized = bookingStartTime.utc().tz(restrictionTimezone);
  const bookingDateStr = bookingStartTimeNormalized.format("YYYY-MM-DD");
  const bookingWeekday = bookingStartTimeNormalized.day();
  const bookingStartValue = bookingStartTime.valueOf();
  const bookingEndValue = bookingEndTime.valueOf();

  const overrideRulesForTheDay = dateOverrides.filter((a) =>
    dayjs.utc(a.date).isSame(bookingStartTime.utc(), "day")
  );
  const recurringRulesForTheDay = recurringRules.filter((a) => a.days.includes(bookingWeekday));

  if (overrideRulesForTheDay.length > 0) {
    // Convert override rules to date ranges and merge overlapping/adjacent ones
    const overrideRanges = overrideRulesForTheDay.map((rule) => {
      const startTimeStr = dayjs.utc(rule.startTime).format("HH:mm");
      const endTimeStr = dayjs.utc(rule.endTime).format("HH:mm");
      const start = dayjs.tz(`${bookingDateStr}T${startTimeStr}`, restrictionTimezone);
      const end = dayjs.tz(`${bookingDateStr}T${endTimeStr}`, restrictionTimezone);
      return {
        start: start.toDate(),
        end: end.toDate(),
      };
    });

    const mergedOverrideRanges = mergeOverlappingRanges(overrideRanges);

    const overrideAllowsBooking = mergedOverrideRanges.some((range) => {
      return bookingStartValue >= range.start.valueOf() && bookingEndValue <= range.end.valueOf();
    });
    return overrideAllowsBooking;
  }

  if (recurringRulesForTheDay.length === 0) return false;

  // Convert recurring rules to date ranges and merge overlapping/adjacent ones
  const recurringRanges = recurringRulesForTheDay.map((rule) => {
    const startTimeStr = dayjs.utc(rule.startTime).format("HH:mm");
    const endTimeStr = dayjs.utc(rule.endTime).format("HH:mm");
    const start = dayjs.tz(`${bookingDateStr}T${startTimeStr}`, restrictionTimezone);
    const end = dayjs.tz(`${bookingDateStr}T${endTimeStr}`, restrictionTimezone);
    return {
      start: start.toDate(),
      end: end.toDate(),
    };
  });

  const mergedRecurringRanges = mergeOverlappingRanges(recurringRanges);

  const recurringAllowsBooking = mergedRecurringRanges.some((range) => {
    return bookingStartValue >= range.start.valueOf() && bookingEndValue <= range.end.valueOf();
  });
  return recurringAllowsBooking;
}
