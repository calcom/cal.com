import type {
  SeatOptionsTransformedSchema,
  SeatOptionsDisabledSchema,
  Seats_2024_06_14,
  Disabled_2024_06_14,
} from "@calcom/platform-types";

export function transformSeatsInternalToApi(
  transformedSeats: SeatOptionsTransformedSchema | SeatOptionsDisabledSchema
): Seats_2024_06_14 | Disabled_2024_06_14 {
  if (transformedSeats.seatsPerTimeSlot == null) {
    return {
      disabled: true,
    } satisfies Disabled_2024_06_14;
  }
  return {
    seatsPerTimeSlot: transformedSeats.seatsPerTimeSlot,
    showAttendeeInfo: transformedSeats.seatsShowAttendees,
    showAvailabilityCount: transformedSeats.seatsShowAvailabilityCount,
  } satisfies Seats_2024_06_14;
}
