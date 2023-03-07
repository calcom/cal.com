import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

export function UserFieldsResponses(props: { calEvent: CalendarEvent }) {
  const { customInputs, userFieldsResponses } = props.calEvent;
  let labelValueMap: Record<string, string | string[]> = {};
  if (userFieldsResponses) {
    for (const [, value] of Object.entries(userFieldsResponses)) {
      labelValueMap[value.label] = value.value;
    }
  } else {
    labelValueMap = customInputs as Record<string, string | string[]>;
  }
  if (!labelValueMap) return null;
  return (
    <>
      {Object.keys(labelValueMap).map((key) =>
        labelValueMap[key] !== "" ? (
          <Info key={key} label={key} description={`${labelValueMap[key]}`} withSpacer />
        ) : null
      )}
    </>
  );
}
