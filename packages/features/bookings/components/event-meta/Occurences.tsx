import { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { processDate } from "@calcom/lib/parse-dates";
import { getRecurringFreq, getCountText, getFrequencyText } from "@calcom/lib/recurringStrings";
import { Alert } from "@calcom/ui/components/alert";
import { Input } from "@calcom/ui/components/form";

import { useBookerTime } from "../../Booker/components/hooks/useBookerTime";

export const EventOccurences = ({ event }: { event: Pick<BookerEvent, "recurringEvent"> }) => {
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
  const { timezone, timeFormat } = useBookerTime();
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

  // Generate human-readable recurrence summary
  const getRecurrenceSummary = () => {
    if (!selectedTimeslot || !recurringEventCount) return null;

    const { freq, interval = 1 } = event.recurringEvent;
    const effectiveCount = occurenceCount || recurringEventCount;

    // Get frequency text using shared helper
    const frequencyText = getFrequencyText(freq, interval);

    // Format the start time
    const formattedTime = processDate(dayjs(selectedTimeslot).tz(timezone), i18n.language, timezone, {
      selectedTimeFormat: timeFormat,
    });

    // Get count text using shared helper
    const countText = getCountText(effectiveCount);

    return `Repeats ${frequencyText} ${countText} starting from ${formattedTime}`;
  };

  if (bookerState === "booking" && recurringEventCount && selectedTimeslot) {
    const summary = getRecurrenceSummary();

    return <div data-testid="recurring-dates">{summary && <p>{summary}</p>}</div>;
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
        data-testid="occurrence-input"
        onKeyDown={(e) => {
          if (["-", "+", "e", "E"].includes(e.key)) {
            e.preventDefault();
          }
        }}
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
