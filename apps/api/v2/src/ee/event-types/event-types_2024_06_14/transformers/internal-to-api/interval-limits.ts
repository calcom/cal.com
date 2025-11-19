import { BookingLimitsEnum_2024_06_14 } from "@calcom/platform-enums";
import type {
  BookingLimitsKeysInputType,
  TransformBookingLimitsSchema_2024_06_14,
} from "@calcom/platform-types";

export function transformIntervalLimitsInternalToApi(
  transformedBookingFields: TransformBookingLimitsSchema_2024_06_14 | null
) {
  if (!transformedBookingFields) {
    return undefined;
  }
  const res: { [K in BookingLimitsKeysInputType]?: number } = {};
  transformedBookingFields &&
    Object.entries(transformedBookingFields).map(([key, value]) => {
      const outputKey: BookingLimitsKeysInputType | undefined = Object.keys(
        BookingLimitsEnum_2024_06_14
      ).find(
        (item) => BookingLimitsEnum_2024_06_14[item as keyof typeof BookingLimitsEnum_2024_06_14] === key
      ) as BookingLimitsKeysInputType;

      if (outputKey) {
        res[outputKey] = value as number;
      }
    });
  return res;
}
