import { getActualRecurringStartTime } from "@calid/features/modules/teams/lib/recurrenceUtil";
import type { TFunction } from "i18next";
import React from "react";
import { RRule } from "rrule";

import dayjs from "@calcom/dayjs";
// TODO: Use browser locale, implement Intl in Dayjs maybe?
import "@calcom/dayjs/locales";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { RecurringEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

export function getRecurringWhen({
  recurringEvent,
  attendee,
}: {
  recurringEvent?: RecurringEvent | null;
  attendee: Pick<Person, "language">;
}) {
  if (recurringEvent) {
    const t = attendee.language.translate;
    const { exDates, rDates, ...rruleOptionsWithoutExDates } = recurringEvent;
    const rruleOptions = new RRule(rruleOptionsWithoutExDates).options;
    const recurringEventConfig: RecurringEvent = {
      freq: rruleOptions.freq,
      count: rruleOptions.count || 1,
      interval: rruleOptions.interval,
    };
    return `${getEveryFreqFor({ t, recurringEvent: recurringEventConfig })}`;
  }
  return "";
}

export function WhenInfo(props: {
  calEvent: CalendarEvent;
  timeZone: string;
  t: TFunction;
  locale: string;
  timeFormat: TimeFormat;
}) {
  const { timeZone, t, calEvent: { recurringEvent } = {}, locale, timeFormat } = props;

  function getRecipientStart(format: string) {
    const startTime = recurringEvent
      ? getActualRecurringStartTime(recurringEvent, props.calEvent.startTime)
      : props.calEvent.startTime;

    return dayjs(startTime).tz(timeZone).locale(locale).format(format);
  }

  function getRecipientEnd(format: string) {
    const startTime = recurringEvent
      ? getActualRecurringStartTime(recurringEvent, props.calEvent.startTime)
      : props.calEvent.startTime;

    const duration = dayjs(props.calEvent.endTime).diff(dayjs(props.calEvent.startTime));
    const endTime = dayjs(startTime).add(duration, "millisecond");

    return endTime.tz(timeZone).locale(locale).format(format);
  }

  const recurringInfo = getRecurringWhen({
    recurringEvent: props.calEvent.recurringEvent,
    attendee: props.calEvent.attendees[0],
  });

  return (
    <div>
      <Info
        label={`${t("when")} ${recurringInfo !== "" ? ` - ${recurringInfo}` : ""}`}
        lineThrough={
          !recurringEvent &&
          !!props.calEvent.cancellationReason &&
          !props.calEvent.cancellationReason.includes("$RCH$")
        }
        description={
          <span data-testid="when">
            {recurringEvent?.count || recurringEvent?.until ? `${t("starting")} ` : ""}
            {getRecipientStart(`dddd, LL | ${timeFormat}`)} - {getRecipientEnd(timeFormat)}{" "}
            <span style={{ color: "#4B5563" }}>({timeZone})</span>
            {recurringEvent?.exDates && recurringEvent.exDates.length > 0 && (
              <span className="text-subtle ml-2">
                • {t("excluding_dates_count", { count: recurringEvent.exDates.length })}
              </span>
            )}
            {recurringEvent?.rDates && recurringEvent.rDates.length > 0 && (
              <span className="text-subtle ml-2">
                • +{recurringEvent.rDates.length} {t("additional")}
              </span>
            )}
          </span>
        }
        withSpacer
      />
    </div>
  );
}
