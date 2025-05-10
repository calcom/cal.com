import type dayjs from "@calcom/dayjs";
import { isTimeOutOfBounds, isTimeViolatingFutureLimit } from "@calcom/lib/isOutOfBounds";
import { PeriodType } from "@calcom/prisma/client";

type PeriodLimits = {
  endOfRollingPeriodEndDayInBookerTz: dayjs.Dayjs | null;
  startOfRangeStartDayInEventTz: dayjs.Dayjs | null;
  endOfRangeEndDayInEventTz: dayjs.Dayjs | null;
};

export class BoundaryChecker {
  /**
   * Filters slots based on time bounds and limits
   */
  public filterSlotsByBoundaries({
    slotsMappedToDate,
    periodLimits,
    periodType,
    minimumBookingNotice,
  }: {
    slotsMappedToDate: Record<string, { time: string; attendees?: number; bookingUid?: string }[]>;
    periodLimits: PeriodLimits;
    periodType: PeriodType;
    minimumBookingNotice: number | undefined;
  }): Record<string, { time: string; attendees?: number; bookingUid?: string }[]> {
    let foundAFutureLimitViolation = false;

    return Object.entries(slotsMappedToDate).reduce((withinBoundsSlotsMappedToDate, [date, slots]) => {
      if (foundAFutureLimitViolation && BoundaryChecker.doesRangeStartFromToday(periodType)) {
        return withinBoundsSlotsMappedToDate;
      }

      const filteredSlots = slots.filter((slot) => {
        const isFutureLimitViolationForTheSlot = isTimeViolatingFutureLimit({
          time: slot.time,
          periodLimits,
        });

        if (isFutureLimitViolationForTheSlot) {
          foundAFutureLimitViolation = true;
        }

        return (
          !isFutureLimitViolationForTheSlot && !isTimeOutOfBounds({ time: slot.time, minimumBookingNotice })
        );
      });

      if (!filteredSlots.length) {
        return withinBoundsSlotsMappedToDate;
      }

      withinBoundsSlotsMappedToDate[date] = filteredSlots;
      return withinBoundsSlotsMappedToDate;
    }, {} as typeof slotsMappedToDate);
  }

  /**
   * Checks if the range starts from today
   */
  public static doesRangeStartFromToday(periodType: PeriodType): boolean {
    return periodType === PeriodType.ROLLING_WINDOW || periodType === PeriodType.ROLLING;
  }
}
