import type z from "zod";

import { SystemField } from "@calcom/features/bookings/lib/getBookingFields";
import type { bookingResponsesDbSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { getBookingWithResponses } from "@calcom/lib/getBooking";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { EventType, Prisma } from ".prisma/client";

export const getCalEventResponses = ({
  bookingFields,
  booking,
  responses,
}: {
  // If the eventType has been deleted and a booking is Accepted later on, then bookingFields will be null and we can't know the label of fields. So, we should store the label as well in the DB
  // Also, it is no longer straightforward to identify if a field is system field or not
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
  const parsedBookingFields = bookingFields ? eventTypeBookingFields.parse(bookingFields) : null;
  const backwardCompatibleResponses =
    responses ?? (booking ? getBookingWithResponses(booking).responses : null);
  if (!backwardCompatibleResponses) throw new Error("Couldn't get responses");

  if (parsedBookingFields) {
    parsedBookingFields.forEach((field) => {
      const label = field.label || field.defaultLabel;
      if (!label) {
        throw new Error('Missing label for booking field "' + field.name + '"');
      }
      if (field.editable === "user" || field.editable === "user-readonly") {
        calEventUserFieldsResponses[field.name] = {
          label,
          value: backwardCompatibleResponses[field.name],
        };
      }
      calEventResponses[field.name] = {
        label,
        value: backwardCompatibleResponses[field.name],
      };
    });
  } else {
    // Alternative way to generate for a booking of whose eventType has been deleted
    for (const [name, value] of Object.entries(backwardCompatibleResponses)) {
      const isSystemField = SystemField.safeParse(name);

      // Use name for Label because we don't have access to the label. This will not be needed once we start storing the label along with the response
      const label = name;

      if (!isSystemField.success) {
        calEventUserFieldsResponses[name] = {
          label,
          value,
        };
      }

      calEventResponses[name] = {
        label,
        value,
      };
    }
  }
  return { userFieldsResponses: calEventUserFieldsResponses, responses: calEventResponses };
};
