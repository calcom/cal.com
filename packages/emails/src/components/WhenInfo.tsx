import { TFunction } from "next-i18next";
import { RRule } from "rrule";

import dayjs from "@calcom/dayjs";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { RecurringEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

function getRecurringWhen({ calEvent }: { calEvent: CalendarEvent }) {
  if (calEvent.recurringEvent) {
    const t = calEvent.attendees[0].language.translate;
    const rruleOptions = new RRule(calEvent.recurringEvent).options;
    const recurringEvent: RecurringEvent = {
      freq: rruleOptions.freq,
      count: rruleOptions.count || 1,
      interval: rruleOptions.interval,
    };
    return ` - ${getEveryFreqFor({ t, recurringEvent })}`;
  }
  return "";
}

export function WhenInfo(props: { calEvent: CalendarEvent; timeZone: string; t: TFunction }) {
  const { timeZone, t, calEvent: { recurringEvent } = {} } = props;

  function getRecipientStart(format: string) {
    return dayjs(props.calEvent.startTime).tz(timeZone).format(format);
  }

  function getRecipientEnd(format: string) {
    return dayjs(props.calEvent.endTime).tz(timeZone).format(format);
  }

  return (
    <div>
      <Info
        label={`${t("when")} ${getRecurringWhen(props)}`}
        lineThrough={
          !!props.calEvent.cancellationReason && !props.calEvent.cancellationReason.includes("$RCH$")
        }
        description={
          <>
            {recurringEvent?.count ? `${t("starting")} ` : ""}
            {t(getRecipientStart("dddd").toLowerCase())}, {t(getRecipientStart("MMMM").toLowerCase())}{" "}
            {getRecipientStart("D, YYYY | h:mma")} - {getRecipientEnd("h:mma")}{" "}
            <span style={{ color: "#888888" }}>({timeZone})</span>
          </>
        }
        withSpacer
      />
    </div>
  );
}
