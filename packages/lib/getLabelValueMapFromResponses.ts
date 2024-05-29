import type z from "zod";

import { TITLE_FIELD } from "@calcom/features/bookings/lib/SystemField";
import type { bookingResponse } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import type { CalendarEvent } from "@calcom/types/Calendar";

export default function getLabelValueMapFromResponses(calEvent: CalendarEvent, isOrganizer = false) {
  const { customInputs, userFieldsResponses, responses, eventTypeId } = calEvent;

  const isDynamicEvent = !eventTypeId;

  let labelValueMap: Record<string, z.infer<typeof bookingResponse>> = {};
  if (userFieldsResponses) {
    if (!!responses?.[TITLE_FIELD] && !isDynamicEvent) {
      userFieldsResponses[TITLE_FIELD] = responses[TITLE_FIELD];
    }

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
