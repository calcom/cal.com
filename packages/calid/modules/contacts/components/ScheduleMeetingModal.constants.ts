import { SystemField } from "@calcom/features/bookings/lib/SystemField";

export const DEFAULT_STEPS = ["Event Type", "Date & Time", "Guests", "Confirm"];
export const STEPS_WITH_BOOKING_FIELDS = ["Event Type", "Date & Time", "Booking Fields", "Guests", "Confirm"];

export const HANDLED_BOOKING_FIELD_NAMES = new Set([
  SystemField.Enum.name,
  SystemField.Enum.email,
  SystemField.Enum.guests,
  SystemField.Enum.location,
]);
