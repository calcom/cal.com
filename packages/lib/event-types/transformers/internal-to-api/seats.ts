import type {
  SeatOptionsTransformedSchema,
  SeatOptionsDisabledSchema,
  CreateEventTypeInput_2024_06_14,
} from "@calcom/platform-types";

export function transformSeatsInternalToApi(
  transformedSeats: SeatOptionsTransformedSchema | SeatOptionsDisabledSchema
): CreateEventTypeInput_2024_06_14["seats"] {
  if (transformedSeats.seatsPerTimeSlot == null) {
    return {
      disabled: true,
    };
  }
  return {
    seatsPerTimeSlot: transformedSeats.seatsPerTimeSlot,
    showAttendeeInfo: transformedSeats.seatsShowAttendees,
    showAvailabilityCount: transformedSeats.seatsShowAvailabilityCount,
  };
}
