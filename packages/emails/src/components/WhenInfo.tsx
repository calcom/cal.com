import type { TFunction } from "next-i18next";
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
    const rruleOptions = new RRule(recurringEvent).options;
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
  isOrganizer?: boolean;
}) {
  const { timeZone, t, calEvent: { recurringEvent } = {}, locale, timeFormat, isOrganizer } = props;

  function getRecipientStart(format: string, time: string) {
    return dayjs(time).tz(timeZone).locale(locale).format(format);
  }

  function getRecipientEnd(format: string, time: string) {
    return dayjs(time).tz(timeZone).locale(locale).format(format);
  }

  const recurringInfo = getRecurringWhen({
    recurringEvent: props.calEvent.recurringEvent,
    attendee: props.calEvent.attendees[0],
  });

  const hideInfo = props.calEvent.differentRoundRobinRecurringHosts && isOrganizer;

  return (
    <div>
      <Info
        label={`${t("when")} ${recurringInfo !== "" && !hideInfo ? ` - ${recurringInfo}` : ""}`}
        lineThrough={
          !!props.calEvent.cancellationReason && !props.calEvent.cancellationReason.includes("$RCH$")
        }
        description={
          <span data-testid="when">
            {recurringEvent?.count && !props.calEvent.differentRoundRobinRecurringHosts
              ? `${t("starting")} `
              : ""}
            {props.calEvent.differentRoundRobinRecurringHosts && isOrganizer ? (
              <>
                {props.calEvent.multiTimes?.map((time) => (
                  <>
                    {getRecipientStart(`dddd, LL | ${timeFormat}`, time.startTime)} -{" "}
                    {getRecipientEnd(timeFormat, time.endTime)}{" "}
                    <span style={{ color: "#4B5563" }}>({timeZone})</span>
                    <br />
                  </>
                ))}
              </>
            ) : (
              <>
                {getRecipientStart(`dddd, LL | ${timeFormat}`, props.calEvent.startTime)} -{" "}
                {getRecipientEnd(timeFormat, props.calEvent.endTime)}{" "}
                <span style={{ color: "#4B5563" }}>({timeZone})</span>
              </>
            )}
          </span>
        }
        withSpacer
      />
    </div>
  );
}
