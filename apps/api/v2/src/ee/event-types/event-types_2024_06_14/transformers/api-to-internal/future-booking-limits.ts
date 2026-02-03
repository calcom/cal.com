import {
  BookingWindowPeriodInputTypeEnum_2024_06_14,
  BookingWindowPeriodOutputTypeEnum_2024_06_14,
} from "@calcom/platform-enums";
import {
  type BusinessDaysWindow_2024_06_14,
  type CreateEventTypeInput_2024_06_14,
  type RangeWindow_2024_06_14,
  type TransformFutureBookingsLimitSchema_2024_06_14,
} from "@calcom/platform-types";

export function transformFutureBookingLimitsApiToInternal(
  inputBookingLimits: CreateEventTypeInput_2024_06_14["bookingWindow"]
): TransformFutureBookingsLimitSchema_2024_06_14 | undefined {
  if (!inputBookingLimits) {
    return;
  }
  if (inputBookingLimits.disabled) {
    return {
      periodType: BookingWindowPeriodOutputTypeEnum_2024_06_14.UNLIMITED,
    };
  }
  switch (inputBookingLimits?.type) {
    case BookingWindowPeriodInputTypeEnum_2024_06_14.businessDays:
      return {
        periodDays: (inputBookingLimits as BusinessDaysWindow_2024_06_14).value,
        periodType: (inputBookingLimits as BusinessDaysWindow_2024_06_14).rolling
          ? BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING_WINDOW
          : BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING,
        periodCountCalendarDays: false,
      };
    case BookingWindowPeriodInputTypeEnum_2024_06_14.calendarDays:
      return {
        periodDays: (inputBookingLimits as BusinessDaysWindow_2024_06_14).value,
        periodType: (inputBookingLimits as BusinessDaysWindow_2024_06_14).rolling
          ? BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING_WINDOW
          : BookingWindowPeriodOutputTypeEnum_2024_06_14.ROLLING,
        periodCountCalendarDays: true,
      };
    case BookingWindowPeriodInputTypeEnum_2024_06_14.range: {
      const startDateStr = (inputBookingLimits as RangeWindow_2024_06_14).value[0].slice(0, 10);
      const endDateStr = (inputBookingLimits as RangeWindow_2024_06_14).value[1].slice(0, 10);
      return {
        periodType: BookingWindowPeriodOutputTypeEnum_2024_06_14.RANGE,
        periodStartDate: new Date(startDateStr),
        periodEndDate: new Date(endDateStr),
      };
    }
    default:
      return undefined;
  }
}
