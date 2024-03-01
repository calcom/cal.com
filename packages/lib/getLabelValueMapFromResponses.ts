import type z from "zod";

import type { bookingResponse } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import type { CalendarEvent } from "@calcom/types/Calendar";

export default function getLabelValueMapFromResponses(calEvent: CalendarEvent, isOrganizer = false) {
  const { customInputs, userFieldsResponses } = calEvent;

  let labelValueMap: Record<string, z.infer<typeof bookingResponse>> = {};
  if (userFieldsResponses) {
    for (const [, value] of Object.entries(userFieldsResponses)) {
      if (!value.label || (!isOrganizer && value.isHidden)) {
        continue;
      }
      labelValueMap[value.label] = value.value;
    }
  } else {
    labelValueMap = customInputs as Record<string, string | string[]>;
  }
  return labelValueMap;
}
