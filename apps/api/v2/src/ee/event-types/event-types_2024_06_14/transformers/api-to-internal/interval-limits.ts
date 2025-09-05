import { BookingLimitsEnum_2024_06_14 } from "@calcom/platform-enums";
import {
  type BookingLimitsKeyOutputType_2024_06_14,
  type CreateEventTypeInput_2024_06_14,
  type TransformBookingLimitsSchema_2024_06_14,
} from "@calcom/platform-types";

export function transformIntervalLimitsApiToInternal(
  inputBookingLimits: CreateEventTypeInput_2024_06_14["bookingLimitsCount"]
) {
  const res: TransformBookingLimitsSchema_2024_06_14 = {};
  if (inputBookingLimits?.disabled) {
    return res;
  }
  inputBookingLimits &&
    Object.entries(inputBookingLimits).map(([key, value]) => {
      const outputKey: BookingLimitsKeyOutputType_2024_06_14 = BookingLimitsEnum_2024_06_14[
        key as keyof typeof BookingLimitsEnum_2024_06_14
      ] satisfies BookingLimitsKeyOutputType_2024_06_14;
      res[outputKey] = value;
    });
  return res;
}
