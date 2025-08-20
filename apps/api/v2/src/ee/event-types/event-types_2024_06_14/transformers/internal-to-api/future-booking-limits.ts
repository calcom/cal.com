import {
  BookingWindowPeriodInputTypeEnum_2024_06_14,
  BookingWindowPeriodOutputTypeEnum_2024_06_14,
} from "@calcom/platform-enums";
import type {
  TransformFutureBookingsLimitSchema_2024_06_14,
  BookingWindow_2024_06_14,
  RangeWindow_2024_06_14,
  CalendarDaysWindow_2024_06_14,
  BusinessDaysWindow_2024_06_14,
  Disabled_2024_06_14,
} from "@calcom/platform-types";

export function transformFutureBookingLimitsInternalToApi(
  transformedFutureBookingsLimitsFields: TransformFutureBookingsLimitSchema_2024_06_14
): BookingWindow_2024_06_14 | undefined {
  switch (transformedFutureBookingsLimitsFields?.periodType) {
    case BookingWindowPeriodOutputTypeEnum_2024_06_14.RANGE:
      return {
        type: BookingWindowPeriodInputTypeEnum_2024_06_14.range,
        value: [
          transformedFutureBookingsLimitsFields?.periodStartDate?.toISOString().split("T")[0],
          transformedFutureBookingsLimitsFields?.periodEndDate?.toISOString().split("T")[0],
        ],
      } as RangeWindow_2024_06_14;
    case BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING_WINDOW:
      return {
        type: transformedFutureBookingsLimitsFields.periodCountCalendarDays
          ? BookingWindowPeriodInputTypeEnum_2024_06_14.calendarDays
          : BookingWindowPeriodInputTypeEnum_2024_06_14.businessDays,
        value: transformedFutureBookingsLimitsFields.periodDays,
        rolling: true,
      } as CalendarDaysWindow_2024_06_14 | BusinessDaysWindow_2024_06_14;
    case BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING:
      return {
        type: transformedFutureBookingsLimitsFields.periodCountCalendarDays
          ? BookingWindowPeriodInputTypeEnum_2024_06_14.calendarDays
          : BookingWindowPeriodInputTypeEnum_2024_06_14.businessDays,
        value: transformedFutureBookingsLimitsFields.periodDays,
        rolling: false,
      } as CalendarDaysWindow_2024_06_14 | BusinessDaysWindow_2024_06_14;

    case BookingWindowPeriodOutputTypeEnum_2024_06_14.UNLIMITED:
      return {
        disabled: true,
      } as Disabled_2024_06_14;
    default:
      return undefined;
  }
}
