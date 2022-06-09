import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import { TFunction } from "next-i18next";
import rrule from "rrule";

import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { RecurringEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

dayjs.extend(timezone);

function getRecurringWhen({ calEvent }: { calEvent: CalendarEvent }) {
  if (calEvent.recurrence !== undefined) {
    const t = calEvent.attendees[0].language.translate;
    const rruleOptions = rrule.fromString(calEvent.recurrence).options;
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
  const { timeZone, t } = props;

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
        lineThrough={!!props.calEvent.cancellationReason}
        description={
          <>
            {props.calEvent.recurrence ? `${t("starting")} ` : ""}
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
