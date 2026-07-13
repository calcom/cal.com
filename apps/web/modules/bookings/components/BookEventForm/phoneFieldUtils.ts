import { SystemField } from "@calcom/lib/bookings/SystemField";

/** Location option value when the booker provides their phone number. */
export const ATTENDEE_PHONE_LOCATION_VALUE = "phone";

export function shouldHideDuplicatePhoneField(
  field: { type: string; name: string },
  locationValue: string | undefined
): boolean {
  return (
    field.type === "phone" &&
    field.name !== SystemField.Enum.location &&
    locationValue === ATTENDEE_PHONE_LOCATION_VALUE
  );
}
