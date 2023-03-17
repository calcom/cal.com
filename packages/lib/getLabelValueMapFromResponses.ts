import type { CalendarEvent } from "@calcom/types/Calendar";

export default function getLabelValueMapFromResponses(calEvent: CalendarEvent) {
  const { customInputs, userFieldsResponses } = calEvent;

  let labelValueMap: Record<string, string | string[]> = {};
  if (userFieldsResponses) {
    for (const [, value] of Object.entries(userFieldsResponses)) {
      labelValueMap[value.label] = value.value;
    }
  } else {
    labelValueMap = customInputs as Record<string, string | string[]>;
  }
  return labelValueMap;
}
