import type { EventType, Prisma } from "@prisma/client";
import type z from "zod";

import { SystemField } from "@calcom/features/bookings/lib/SystemField";
import type { bookingResponsesDbSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { contructEmailFromPhoneNumber } from "@calcom/lib/contructEmailFromPhoneNumber";
import { getBookingWithResponses } from "@calcom/lib/getBooking";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

export const getCalEventResponses = ({
  bookingFields,
  booking,
  responses,
}: {
  bookingFields: z.infer<typeof eventTypeBookingFields> | EventType["bookingFields"] | null;
  booking?: Prisma.BookingGetPayload<{
    select: {
      description: true;
      customInputs: true;
      attendees: {
        select: {
          email: true;
          name: true;
        };
      };
      location: true;
      responses: true;
    };
  }>;
  responses?: z.infer<typeof bookingResponsesDbSchema>;
}) => {
  const calEventUserFieldsResponses = {} as NonNullable<CalendarEvent["userFieldsResponses"]>;
  const calEventResponses = {} as NonNullable<CalendarEvent["responses"]>;

  const backwardCompatibleResponses =
    responses ?? (booking ? getBookingWithResponses(booking).responses : null);
  if (!backwardCompatibleResponses) throw new Error("Couldn't get responses");

  // placeholder email
  if (!backwardCompatibleResponses.email) {
    if (typeof backwardCompatibleResponses["attendeePhoneNumber"] !== "string")
      throw new Error("Both Phone and Email are missing");

    backwardCompatibleResponses.email = contructEmailFromPhoneNumber(
      backwardCompatibleResponses["attendeePhoneNumber"]
    );
  }

  const PHONE_FIELD_LABELS: Record<string, string> = {
    number_text_notifications: "Phone Number (text notification)",
    phone: "Phone Number",
    phone_number: "Phone Number",
    attendeePhoneNumber: "Phone Number",
  };

  const PHONE_KEYS = ["attendeePhoneNumber", "number_text_notifications", "phone_number", "phone"] as const;

  const parsedBookingFields = bookingFields ? eventTypeBookingFields.parse(bookingFields) : null;

  if (parsedBookingFields) {
    for (const field of parsedBookingFields) {
      const dynamicLabel = field.defaultLabel ? PHONE_FIELD_LABELS[field.defaultLabel] : undefined;
      const label = dynamicLabel || field.label || field.defaultLabel;
      if (!label) throw new Error(`Missing label for booking field "${field.name}"`);

      if (field.name === "guests" && field.hidden) {
        backwardCompatibleResponses[field.name] = [];
      }

      const rawValue = backwardCompatibleResponses[field.name];
      const finalValue = rawValue === undefined || rawValue === null ? "N/A" : rawValue;

      const responseValue = {
        label,
        value: finalValue,
        isHidden: !!field.hidden,
      };

      if (field.editable === "user" || field.editable === "user-readonly") {
        calEventUserFieldsResponses[field.name] = responseValue;
      }

      calEventResponses[field.name] = responseValue;
    }
  } else {
    for (const [name, value] of Object.entries(backwardCompatibleResponses)) {
      const isSystemField = SystemField.safeParse(name);
      const label = name;

      const finalValue = value === undefined || value === null ? "N/A" : value;

      const responseValue = { label, value: finalValue };

      if (!isSystemField.success) {
        calEventUserFieldsResponses[name] = responseValue;
      }

      calEventResponses[name] = responseValue;
    }
  }

  // Phone number normalization - fallback logic
  let finalPhone: { label: string; value: any; isHidden: boolean } | undefined;

  for (const key of PHONE_KEYS) {
    const entry = calEventResponses[key];
    if (entry?.value != null && entry.value !== "N/A") {
      finalPhone = {
        label: entry.label,
        value: entry.value,
        isHidden: entry.isHidden ?? false,
      };
      break;
    }
  }

  // Remove all phone variants
  for (const key of PHONE_KEYS) {
    delete calEventResponses[key];
  }

  // Insert final normalized attendeePhoneNumber
  if (finalPhone) {
    calEventResponses.attendeePhoneNumber = finalPhone;
  }

  return { userFieldsResponses: calEventUserFieldsResponses, responses: calEventResponses };
};
