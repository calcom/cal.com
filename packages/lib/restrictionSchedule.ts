import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

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

  const bookingStartTimeNormalized = dayjs(bookingStartTime.utc()).tz(restrictionTimezone);
  const bookingEndTimeNormalized = dayjs(bookingEndTime.utc()).tz(restrictionTimezone);
  const bookingDateStr = bookingStartTimeNormalized.format("YYYY-MM-DD");
  const bookingWeekday = bookingStartTimeNormalized.day();
  const bookingStartValue = bookingStartTime.valueOf();
  const bookingEndValue = bookingEndTime.valueOf();

  const overrideRulesForTheDay = dateOverrides.filter((a) =>
    dayjs.utc(a.date).isSame(bookingStartTime.utc(), "day")
  );
  const recurringRuleForTheDay = recurringRules.find((a) => a.days.includes(bookingWeekday));

  if (overrideRulesForTheDay.length > 0) {
    const overrideAllowsBooking = overrideRulesForTheDay.some((rule) => {
      const startTimeStr = dayjs.utc(rule.startTime).format("HH:mm");
      const endTimeStr = dayjs.utc(rule.endTime).format("HH:mm");
      const start = dayjs.tz(`${bookingDateStr}T${startTimeStr}`, restrictionTimezone);
      const end = dayjs.tz(`${bookingDateStr}T${endTimeStr}`, restrictionTimezone);
      return bookingStartValue >= start.valueOf() && bookingEndValue <= end.valueOf();
    });
    return overrideAllowsBooking;
  }
  if (!recurringRuleForTheDay) return false;
  const startTimeStr = dayjs.utc(recurringRuleForTheDay.startTime).format("HH:mm");
  const endTimeStr = dayjs.utc(recurringRuleForTheDay.endTime).format("HH:mm");
  const start = dayjs.tz(`${bookingDateStr}T${startTimeStr}`, restrictionTimezone);
  const end = dayjs.tz(`${bookingDateStr}T${endTimeStr}`, restrictionTimezone);

  return bookingStartValue >= start.valueOf() && bookingEndValue <= end.valueOf();
}
