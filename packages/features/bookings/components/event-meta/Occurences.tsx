import { useEffect } from "react";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseRecurringDates } from "@calcom/lib/parse-dates";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { Tooltip } from "@calcom/ui";
import { Input } from "@calcom/ui";

import { useTimePreferences } from "../../lib";
import type { PublicEvent } from "../../types";

export const EventOccurences = ({ event }: { event: PublicEvent }) => {
  const { t, i18n } = useLocale();
  const [setRecurringEventCount, recurringEventCount] = useBookerStore((state) => [
    state.setRecurringEventCount,
    state.recurringEventCount,
  ]);
  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);
  const bookerState = useBookerStore((state) => state.state);
  const { timezone, timeFormat } = useTimePreferences();

  // Set initial value in booker store.
  useEffect(() => {
    if (!event.recurringEvent?.count) return;
    setRecurringEventCount(event.recurringEvent.count);
  }, [setRecurringEventCount, event.recurringEvent]);

  if (!event.recurringEvent) return null;

  if (bookerState === "booking" && recurringEventCount && selectedTimeslot) {
    const [recurringStrings] = parseRecurringDates(
      {
        startDate: selectedTimeslot,
        timeZone: timezone,
        recurringEvent: event.recurringEvent,
        recurringCount: recurringEventCount,
        selectedTimeFormat: timeFormat,
      },
      i18n.language
    );
    return (
      <>
        {recurringStrings.slice(0, 5).map((timeFormatted, key) => (
          <p key={key}>{timeFormatted}</p>
        ))}
        <Tooltip
          content={recurringStrings.slice(5).map((timeFormatted, key) => (
            <p key={key}>{timeFormatted}</p>
          ))}>
          <p className=" text-sm">+ {t("plus_more", { count: recurringStrings.length - 5 })}</p>
        </Tooltip>
      </>
    );
  }

  return (
    <>
      {getRecurringFreq({ t, recurringEvent: event.recurringEvent })}
      <br />
      <Input
        className="my-1 mr-3 inline-flex h-[26px] w-[46px] py-0 px-1"
        type="number"
        defaultValue={event.recurringEvent.count}
        onChange={(event) => {
          setRecurringEventCount(parseInt(event?.target.value));
        }}
      />
      {t("occurrence", {
        count: recurringEventCount || event.recurringEvent.count,
      })}
    </>
  );
};
