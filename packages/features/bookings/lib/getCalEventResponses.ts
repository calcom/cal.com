import type z from "zod";

import { SystemField } from "@calcom/features/bookings/lib/getBookingFields";
import type { bookingResponsesDbSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

export const getCalEventResponses = ({
  bookingFields,
  responses,
}: {
  // If the eventType has been deleted and a booking is Accepted later on, then bookingFields will be null and we can't know the label of fields. So, we should store the label as well in the DB
  // Also, it is no longer straightforward to identify if a field is system field or not
  bookingFields: z.infer<typeof eventTypeBookingFields> | null;
  responses: z.infer<typeof bookingResponsesDbSchema>;
}) => {
  const calEventUserFieldsResponses = {} as NonNullable<CalendarEvent["userFieldsResponses"]>;
  const calEventResponses = {} as NonNullable<CalendarEvent["responses"]>;

  if (bookingFields) {
    bookingFields.forEach((field) => {
      const label = field.label || field.defaultLabel;
      if (!label) {
        throw new Error('Missing label for booking field "' + field.name + '"');
      }
      if (field.editable === "user" || field.editable === "user-readonly") {
        calEventUserFieldsResponses[field.name] = {
          label,
          value: responses[field.name],
        };
      }
      calEventResponses[field.name] = {
        label,
        value: responses[field.name],
      };
    });
  } else {
    // Alternative way to generate for a booking of whose eventType has been deleted
    for (const [name, value] of Object.entries(responses)) {
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
  return { calEventUserFieldsResponses, calEventResponses };
};
