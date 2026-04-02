import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerTime } from "@calcom/features/bookings/Booker/hooks/useBookerTime";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseRecurringDates } from "@calcom/lib/parse-dates";
import { getRecurringFreq } from "@calcom/lib/recurringStrings";
import { getFirstShiftFlags, getTimeShiftFlags } from "@calcom/lib/timeShift";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Input } from "@calcom/ui/components/form";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { useEffect, useState } from "react";

export const EventOccurences = ({ event }: { event: Pick<BookerEvent, "recurringEvent"> }) => {
  const maxOccurences = event.recurringEvent?.count || null;
  const { t, i18n } = useLocale();
  const [
    setRecurringEventCount,
    recurringEventCount,
    setRecurringEventCountQueryParam,
    recurringEventCountQueryParam,
  ] = useBookerStoreContext((state) => [
    state.setRecurringEventCount,
    state.recurringEventCount,
    state.setRecurringEventCountQueryParam,
    state.recurringEventCountQueryParam,
  ]);
  const selectedTimeslot = useBookerStoreContext((state) => state.selectedTimeslot);
  const bookerState = useBookerStoreContext((state) => state.state);
  const { timezone, timeFormat } = useBookerTime();
  const [warning, setWarning] = useState(false);

  const validateAndSetRecurringEventCount = (value: number | string) => {
    const inputValue = parseInt(value as string);
    const isValid =
      !isNaN(inputValue) && inputValue >= 1 && maxOccurences !== null && inputValue <= maxOccurences;

    if (isValid) {
      setRecurringEventCount(inputValue);
      setWarning(false);
    } else {
      setRecurringEventCount(maxOccurences);
      setWarning(true);
    }
  };

  useEffect(() => {
    if (!event.recurringEvent?.count) return;

    if (recurringEventCountQueryParam) {
      validateAndSetRecurringEventCount(recurringEventCountQueryParam);
    } else {
      setRecurringEventCount(maxOccurences);
      setRecurringEventCountQueryParam(maxOccurences);
    }
  }, [setRecurringEventCount, event.recurringEvent, recurringEventCount, recurringEventCountQueryParam]);
  if (!event.recurringEvent) return null;

  if (bookerState === "booking" && recurringEventCount && selectedTimeslot) {
    const [recurringStrings, recurringDates] = parseRecurringDates(
      {
        startDate: selectedTimeslot,
        timeZone: timezone,
        recurringEvent: event.recurringEvent,
        recurringCount: recurringEventCount,
        selectedTimeFormat: timeFormat,
      },
      i18n.language
    );
    const shiftFlags = getTimeShiftFlags({ dates: recurringDates, timezone });
    const displayFlags = getFirstShiftFlags(shiftFlags);
    return (
      <div data-testid="recurring-dates">
        {recurringStrings.slice(0, 5).map((timeFormatted, key) => (
          <p key={key}>
            {timeFormatted}
            {displayFlags[key] && (
              <>
                {" "}
                <Badge variant="orange" size="sm">
                  {t("time_shift")}
                </Badge>
              </>
            )}
          </p>
        ))}
        {recurringStrings.length > 5 && (
          <Tooltip
            content={recurringStrings.slice(5).map((timeFormatted, key) => (
              <p key={key}>
                {timeFormatted}
                {displayFlags[key + 5] && (
                  <>
                    {" "}
                    <Badge variant="orange" size="sm">
                      {t("time_shift")}
                    </Badge>
                  </>
                )}
              </p>
            ))}>
            <p className=" text-sm">+ {t("plus_more", { count: recurringStrings.length - 5 })}</p>
          </Tooltip>
        )}
      </div>
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
        defaultValue={recurringEventCountQueryParam || event.recurringEvent.count}
        data-testid="occurrence-input"
        onChange={(event) => {
          const inputValue = parseInt(event.target.value);
          setRecurringEventCountQueryParam(inputValue);
          validateAndSetRecurringEventCount(event.target.value);
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
