import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseRecurringDates } from "@calcom/lib/parse-dates";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { Alert } from "@calcom/ui/components/alert";
import { Input } from "@calcom/ui/components/form";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { useBookerTime } from "../../Booker/components/hooks/useBookerTime";

const parseCount = (value: number | string | null): number | null => {
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const clamp = (num: number, min: number, max: number): number => Math.max(min, Math.min(num, max));

const validateCount = (value: number | string, max: number | undefined): boolean => {
  const num = parseCount(value);
  if (num === null) return false;
  return num >= 1 && (max === undefined || num <= max);
};
const getValidCount = (value: number | null, max: number, defaultValue: string | null): number => {
  const parsedValue = parseCount(value);
  const parsedDefault = parseCount(defaultValue) ?? 1;
  const num = parsedValue ?? parsedDefault;
  return clamp(num, 1, max);
};

const RecurringDatesView = ({
  recurringEvent,
  recurringCount,
}: {
  recurringEvent: NonNullable<BookerEvent["recurringEvent"]>;
  recurringCount: number;
}) => {
  const { timezone, timeFormat } = useBookerTime();
  const selectedTimeslot = useBookerStore((s) => s.selectedTimeslot);
  const { t, i18n } = useLocale();

  if (!selectedTimeslot) return null;

  const [recurringStrings] = parseRecurringDates(
    {
      startDate: selectedTimeslot,
      timeZone: timezone,
      recurringEvent,
      recurringCount,
      selectedTimeFormat: timeFormat,
    },
    i18n.language
  );

  const firstFive = recurringStrings.slice(0, 5);
  const rest = recurringStrings.slice(5);

  return (
    <div data-testid="recurring-dates">
      {firstFive.map((str, i) => (
        <p key={i}>{str}</p>
      ))}
      {rest.length > 0 && (
        <Tooltip
          content={rest.map((str, i) => (
            <p key={i}>{str}</p>
          ))}>
          <p className="text-sm">+ {t("plus_more", { count: rest.length })}</p>
        </Tooltip>
      )}
    </div>
  );
};

const RecurrenceForm = ({
  defaultCount,
  recurringEvent,
  recurringEventCount,
  setRecurringEventCount,
}: {
  defaultCount: string | null;
  recurringEvent: NonNullable<BookerEvent["recurringEvent"]>;
  recurringEventCount: number;
  setRecurringEventCount: (val: number | null) => void;
}) => {
  const { t } = useLocale();
  const maxOccurences = recurringEvent.count;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const inputValue = parseInt(e.target.value, 10);
    setRecurringEventCount(getValidCount(inputValue, maxOccurences, defaultCount));
  };
  const [inputValue, setInputValue] = useState(recurringEventCount.toString());

  return (
    <>
      {getRecurringFreq({ t, recurringEvent })}
      <br />
      <Input
        className="my-1 mr-3 inline-flex h-[26px] w-[46px] px-1 py-0"
        type="number"
        min="1"
        max={maxOccurences}
        defaultValue={recurringEventCount}
        data-testid="occurrence-input"
        onChange={handleInputChange}
      />
      {t("occurrence", {
        count: recurringEventCount,
      })}
      {!validateCount(inputValue, maxOccurences) && (
        <div className="-ml-4 mr-4 mt-2 flex">
          <Alert severity="warning" title={t("enter_number_between_range", { maxOccurences })} />
        </div>
      )}
    </>
  );
};

export const EventOccurences = ({ event }: { event: Pick<BookerEvent, "recurringEvent"> }) => {
  const [setRecurringEventCount, recurringEventCount] = useBookerStore((s) => [
    s.setRecurringEventCount,
    s.recurringEventCount,
  ]);
  const bookerState = useBookerStore((s) => s.state);
  const params = useSearchParams();

  const defaultCount = params.get("occurrenceCount");
  const recurringEvent = event.recurringEvent;
  const maxOccurences = recurringEvent?.count;

  useEffect(() => {
    if (!recurringEvent || !maxOccurences) return;

    const validCount = getValidCount(recurringEventCount, maxOccurences, defaultCount);
    if (validCount !== recurringEventCount) {
      setRecurringEventCount(validCount);
    }
  }, [defaultCount, recurringEvent, recurringEventCount, maxOccurences, setRecurringEventCount]);

  if (!recurringEvent || recurringEventCount === null || !validateCount(recurringEventCount, maxOccurences))
    return null;

  if (bookerState === "booking" && recurringEventCount && recurringEvent) {
    return <RecurringDatesView recurringEvent={recurringEvent} recurringCount={recurringEventCount} />;
  }

  return (
    <RecurrenceForm
      defaultCount={defaultCount}
      recurringEvent={recurringEvent}
      recurringEventCount={recurringEventCount}
      setRecurringEventCount={setRecurringEventCount}
    />
  );
};
