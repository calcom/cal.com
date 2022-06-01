import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

export function CustomInputs(props: { calEvent: CalendarEvent }) {
  const { customInputs } = props.calEvent;
  if (!customInputs) return null;

  return (
    <>
      {Object.keys(customInputs).map((key) =>
        customInputs[key] !== "" ? (
          <Info key={key} label={key} description={`${customInputs[key]}`} withSpacer />
        ) : null
      )}
    </>
  );
}
