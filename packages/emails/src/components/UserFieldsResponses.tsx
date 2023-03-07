import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

export function UserFieldsResponses(props: { calEvent: CalendarEvent }) {
  const { customInputs, userFieldsResponses } = props.calEvent;
  const responses = userFieldsResponses || customInputs;
  if (!responses) return null;
  return (
    <>
      {Object.keys(responses).map((key) =>
        responses[key] !== "" ? (
          <Info key={key} label={key} description={`${responses[key]}`} withSpacer />
        ) : null
      )}
    </>
  );
}
