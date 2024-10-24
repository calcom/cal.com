import type {
  CreateEventTypeInput_2024_06_14,
  SeatOptionsTransformedSchema,
  SeatOptionsDisabledSchema,
} from "@calcom/platform-types";

export function transformSeatsApiToInternal(
  inputSeats: CreateEventTypeInput_2024_06_14["seats"]
): SeatOptionsTransformedSchema | SeatOptionsDisabledSchema | undefined {
  if (!inputSeats) return undefined;

  if (inputSeats.disabled)
    return {
      seatsPerTimeSlot: null,
    };

  return {
    seatsPerTimeSlot: inputSeats.seatsPerTimeSlot,
    seatsShowAttendees: inputSeats.showAttendeeInfo,
    seatsShowAvailabilityCount: inputSeats.showAvailabilityCount,
  };
}
