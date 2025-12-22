import type z from "zod";

import { TITLE_FIELD, SMS_REMINDER_NUMBER_FIELD } from "@calcom/lib/bookings/SystemField";
import type { dbReadResponseSchema as bookingResponse } from "@calcom/lib/dbReadResponseSchema";
import type { CalendarEvent } from "@calcom/types/Calendar";

export default function getLabelValueMapFromResponses(
  calEvent: Pick<CalendarEvent, "customInputs" | "userFieldsResponses" | "responses" | "eventTypeId">,
  isOrganizer = false
) {
  const { customInputs, userFieldsResponses, responses, eventTypeId } = calEvent;

  const isDynamicEvent = !eventTypeId;

  let labelValueMap: Record<string, z.infer<typeof bookingResponse>> = {};
  if (userFieldsResponses) {
    if (!!responses?.[TITLE_FIELD] && !isDynamicEvent) {
      userFieldsResponses[TITLE_FIELD] = responses[TITLE_FIELD];
    }
    if (!!responses?.[SMS_REMINDER_NUMBER_FIELD] && !isDynamicEvent) {
      userFieldsResponses[SMS_REMINDER_NUMBER_FIELD] = responses[SMS_REMINDER_NUMBER_FIELD];
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
