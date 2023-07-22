import { useEffect, useState } from "react";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseRecurringDates } from "@calcom/lib/parse-dates";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { Tooltip, Alert } from "@calcom/ui";
import { Input } from "@calcom/ui";

import { useTimePreferences } from "../../lib";
import type { PublicEvent } from "../../types";

export const EventOccurences = ({ event }: { event: PublicEvent }) => {
  const maxOccurences = event.recurringEvent?.count || null;
  const { t, i18n } = useLocale();
  const [setRecurringEventCount, recurringEventCount, setOccurenceCount, occurenceCount] = useBookerStore(
    (state) => [
      state.setRecurringEventCount,
      state.recurringEventCount,
      state.setOccurenceCount,
      state.occurenceCount,
    ]
  );
  const selectedTimeslot = useBookerStore((state) => state.selectedTimeslot);
  const bookerState = useBookerStore((state) => state.state);
  const { timezone, timeFormat } = useTimePreferences();
  const [warning, setWarning] = useState(false);
  // Set initial value in booker store.
  useEffect(() => {
    if (!event.recurringEvent?.count) return;
    setOccurenceCount(occurenceCount || event.recurringEvent.count);
    setRecurringEventCount(recurringEventCount || event.recurringEvent.count);
    if (occurenceCount && (occurenceCount > event.recurringEvent.count || occurenceCount < 1))
      setWarning(true);
  }, [setRecurringEventCount, event.recurringEvent, recurringEventCount, setOccurenceCount, occurenceCount]);
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
        {recurringStrings.length > 5 && (
          <Tooltip
            content={recurringStrings.slice(5).map((timeFormatted, key) => (
              <p key={key}>{timeFormatted}</p>
            ))}>
            <p className=" text-sm">+ {t("plus_more", { count: recurringStrings.length - 5 })}</p>
          </Tooltip>
        )}
      </>
    );
  }

  return (
    <>
      {getRecurringFreq({ t, recurringEvent: event.recurringEvent })}
      <br />
      <Input
        className="my-1 mr-3 inline-flex h-[26px] w-[46px] px-1 py-0"
        type="number"
        min="1"
        max={event.recurringEvent.count}
        defaultValue={occurenceCount || event.recurringEvent.count}
        onChange={(event) => {
          const pattern = /^(?=.*[0-9])\S+$/;
          const inputValue = parseInt(event.target.value);
          setOccurenceCount(inputValue);
          if (
            !pattern.test(event.target.value) ||
            inputValue < 1 ||
            (maxOccurences && inputValue > maxOccurences)
          ) {
            setWarning(true);
            setRecurringEventCount(maxOccurences);
          } else {
            setWarning(false);
            setRecurringEventCount(inputValue);
          }
        }}
      />

      {t("occurrence", {
        count: recurringEventCount || event.recurringEvent.count,
      })}
      {warning && (
        <div className="-ml-4 mr-4 mt-2 flex">
          <Alert severity="warning" title={t("enter_number_between_range", { maxOccurences })} />
        </div>
      )}
    </>
  );
};
