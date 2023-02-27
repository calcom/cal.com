import type { BookingFormValues } from "bookings/Booker";
import type { TFunction } from "next-i18next";

import type { ValidationErrors } from "../../types";

/**
 * Ensures guest emails only appear once in an invite. Validates both
 * guests and main attendee.
 */
export const validateUniqueGuests = (
  guests: BookingFormValues["guests"],
  bookingEmail: BookingFormValues["email"],
  t: TFunction
): ValidationErrors<BookingFormValues> | null => {
  if (!guests || !guests.length) return null;

  const errors: ValidationErrors<BookingFormValues> = [];

  guests.forEach((guest, index) => {
    if (
      guest.email === bookingEmail ||
      guests.filter((currentGuest) => currentGuest.email === guest.email).length > 1
    ) {
      errors.push({ key: `guests.${index}`, error: { type: "validate", message: t("already_invited") } });
    }
  });

  return errors.length > 0 ? errors : null;
};
