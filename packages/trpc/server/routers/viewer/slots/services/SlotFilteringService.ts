import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { withReporting } from "@calcom/lib/sentryWrapper";

/**
 * Service responsible for filtering slots based on various criteria.
 * Handles date range filtering and bookability status calculations.
 */
export class SlotFilteringService {
  /**
   * Filters slots to only include dates within the requested range.
   * This is necessary because buildDateRanges uses a ±1 day buffer when checking
   * if date overrides should be included (to handle timezone edge cases), which can
   * cause slots from adjacent days to leak into the response.
   */
  private _filterSlotsByRequestedDateRange<
    T extends Record<string, { time: string; attendees?: number; bookingUid?: string }[]>,
  >({
    slotsMappedToDate,
    startTime,
    endTime,
    timeZone,
  }: {
    slotsMappedToDate: T;
    startTime: string;
    endTime: string;
    timeZone: string | undefined;
  }): T {
    if (!timeZone) {
      return slotsMappedToDate;
    }
    const inputStartTime = dayjs(startTime).tz(timeZone);
    const inputEndTime = dayjs(endTime).tz(timeZone);

    // fr-CA uses YYYY-MM-DD format
    const formatter = new Intl.DateTimeFormat("fr-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timeZone,
    });

    const allowedDates = new Set<string>();
    for (let d = inputStartTime.startOf("day"); !d.isAfter(inputEndTime, "day"); d = d.add(1, "day")) {
      allowedDates.add(formatter.format(d.toDate()));
    }

    const filtered = {} as T;
    for (const [date, slots] of Object.entries(slotsMappedToDate)) {
      if (allowedDates.has(date)) {
        (filtered as Record<string, typeof slots>)[date] = slots;
      }
    }
    return filtered;
  }

  filterSlotsByRequestedDateRange = withReporting(
    this._filterSlotsByRequestedDateRange.bind(this),
    "filterSlotsByRequestedDateRange"
  );

  /**
   * Gets all dates within a range with their bookability status.
   * Used for period limit calculations.
   */
  private _getAllDatesWithBookabilityStatus(availableDates: string[]) {
    const availableDatesSet = new Set(availableDates);
    const firstDate = dayjs(availableDates[0]);
    const lastDate = dayjs(availableDates[availableDates.length - 1]);
    const allDates: Record<string, { isBookable: boolean }> = {};

    let currentDate = firstDate;
    while (currentDate <= lastDate) {
      allDates[currentDate.format("YYYY-MM-DD")] = {
        isBookable: availableDatesSet.has(currentDate.format("YYYY-MM-DD")),
      };

      currentDate = currentDate.add(1, "day");
    }
    return allDates;
  }

  getAllDatesWithBookabilityStatus = withReporting(
    this._getAllDatesWithBookabilityStatus.bind(this),
    "getAllDatesWithBookabilityStatus"
  );
}
