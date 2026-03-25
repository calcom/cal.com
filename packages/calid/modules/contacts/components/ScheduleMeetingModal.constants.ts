import { SystemField } from "@calcom/features/bookings/lib/SystemField";

export const DEFAULT_STEPS = ["Event Type", "Location + Date & Time", "Booking Fields", "Confirm"];
export const STEPS_WITH_BOOKING_FIELDS = DEFAULT_STEPS;

export const HANDLED_BOOKING_FIELD_NAMES = new Set([
  SystemField.Enum.name,
  SystemField.Enum.email,
  SystemField.Enum.guests,
  SystemField.Enum.location,
]);
