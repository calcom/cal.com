import dayjs from "@calcom/dayjs";

import type { QuickAvailabilityCheck } from "../types";
import { isSlotEquivalent, isValidISOFormat } from "./isSlotEquivalent";

type Maybe<T> = T | undefined;

// Format is YYYY-MM-DD
type DateInBookerTimeZone = string;

// Format is YYYY-MM-DDTHH:mm:ssZ
type SlotInIsoFormat = string;
type SlotsInIso = { time: SlotInIsoFormat }[];
type ScheduleData = {
  /**
   * `slots` is a map of date in Booker's timezone to an array of time slots in ISO format
   * So, `DateInBookerTimeZone` could be on a different day number than the slot date in ISO format
   * For example, if Booker's timezone is UTC+5:30, and timeslot is 2025-01-02T21:00:00Z, then `DateInBookerTimeZone` could be 2025-01-03 as it is 02:30 AM next day in IST
   */
  slots: Record<DateInBookerTimeZone, SlotsInIso>;
};

function _isSlotPresent(slotsInIsoForDate: Maybe<SlotsInIso>, slotToCheckInIso: SlotInIsoFormat) {
  if (!slotsInIsoForDate) return false;
  // Check if the exact time slot exists in the available slots
  return slotsInIsoForDate.some((slot) => {
    return isSlotEquivalent({ slotTimeInIso: slot.time, slotToCheckInIso });
  });
}

function _isSlotPresentInSchedule({
  scheduleData,
  dateInGMT,
  slotToCheckInIso,
}: {
  scheduleData: ScheduleData;
  /**
   * It is just the date in format YYYY-MM-DD
   */
  dateInGMT: string;
  slotToCheckInIso: SlotInIsoFormat;
}) {
  // Check if the slot is present under the date, previous date and next date
  // Timezones can't be more than 1 day apart, so we can safely assume that previous and next day covers all the dates where a time slot can be present
  // We don't want to look up for a slot over all the dates in the schedule data unnecessarily for performance reasons
  const dateBefore = dayjs(dateInGMT).subtract(1, "day").format("YYYY-MM-DD");
  const dateAfter = dayjs(dateInGMT).add(1, "day").format("YYYY-MM-DD");

  // No matter what timezone the booker is in, the slot has to be in one of these three dates
  const slotsInIsoForDate = scheduleData.slots[dateInGMT] as Maybe<SlotsInIso>;
  const slotsInIsoForDateBefore = scheduleData.slots[dateBefore] as Maybe<SlotsInIso>;
  const slotsInIsoForDateAfter = scheduleData.slots[dateAfter] as Maybe<SlotsInIso>;

  const matchFoundOnDate = _isSlotPresent(slotsInIsoForDate, slotToCheckInIso);
  if (matchFoundOnDate) return true;

  const matchFoundOnDateBefore = _isSlotPresent(slotsInIsoForDateBefore, slotToCheckInIso);
  if (matchFoundOnDateBefore) return true;

  const matchFoundOnDateAfter = _isSlotPresent(slotsInIsoForDateAfter, slotToCheckInIso);
  if (matchFoundOnDateAfter) return true;

  return false;
}

/**
 * Checks if a given time slot is available in the schedule
 * It should never give false negative, false positives are fine.
 * It could be unavailable for any number of reasons including the slot being reserved and not actually booked
 * @returns boolean - true if the slot is available, false otherwise.
 */
export const isTimeSlotAvailable = ({
  scheduleData,
  slotToCheckInIso,
  quickAvailabilityChecks,
}: {
  scheduleData: ScheduleData | null;
  slotToCheckInIso: SlotInIsoFormat;
  quickAvailabilityChecks: QuickAvailabilityCheck[];
}) => {
  const isUnavailableAsPerQuickCheck =
    quickAvailabilityChecks &&
    quickAvailabilityChecks.some(
      (slot) => slot.utcStartIso === slotToCheckInIso && slot.status !== "available"
    );

  if (isUnavailableAsPerQuickCheck) return false;

  // If schedule is not loaded or other variables are unavailable consider the slot available
  if (!scheduleData) {
    return true;
  }

  const dateInGMT = isValidISOFormat(slotToCheckInIso) ? slotToCheckInIso.split("T")[0] : null;
  // If the date is not in ISO format, we could erroneously consider the slot unavailable, so be on the safe side and consider it available
  // Though this could be a false positive, it's better to consider the slot available than unavailable
  if (!dateInGMT) return true;

  return _isSlotPresentInSchedule({
    scheduleData,
    dateInGMT,
    slotToCheckInIso,
  });
};
