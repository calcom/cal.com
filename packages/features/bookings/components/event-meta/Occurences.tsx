import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { Input } from "@calcom/ui";

import { PublicEvent } from "../types";

export const EventOccurences = ({ event }: { event: PublicEvent }) => {
  const { t } = useLocale();
  // @TODO: Save in form state.
  const [recurringEventCount, setRecurringEventCount] = useState(event?.recurringEvent?.count);

  if (!event.recurringEvent) return null;

  return (
    <>
      {getRecurringFreq({ t, recurringEvent: event.recurringEvent })}
      <Input
        className="mr-3 mt-1 inline-flex w-[60px]"
        type="number"
        defaultValue={event.recurringEvent.count}
        onChange={(event) => {
          setRecurringEventCount(parseInt(event?.target.value));
        }}
      />
      {t("occurrence", {
        count: recurringEventCount,
      })}
    </>
  );
};
