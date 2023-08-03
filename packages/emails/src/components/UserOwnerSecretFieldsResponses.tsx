import { getLabelValueMapFromResponsesForSecretQuestions } from "@calcom/lib/getLabelValueMapFromResponses";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

export function UserOwnerSecretFieldsResponses(props: { calEvent: CalendarEvent }) {
  const labelValueMap = getLabelValueMapFromResponsesForSecretQuestions(props.calEvent);

  if (!labelValueMap) return null;
  return (
    <>
      {Object.keys(labelValueMap).map((key) =>
        labelValueMap[key] !== "" ? (
          <Info
            key={key}
            label={key}
            description={`${labelValueMap[key] ? labelValueMap[key] : ""}`}
            withSpacer
          />
        ) : null
      )}
    </>
  );
}
