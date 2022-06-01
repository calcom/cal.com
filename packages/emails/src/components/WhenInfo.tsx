import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import { TFunction } from "next-i18next";
import rrule from "rrule";

import type { CalendarEvent, RecurringEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

dayjs.extend(timezone);

function getRecurringWhen(props: { calEvent: CalendarEvent; recurringEvent: RecurringEvent }) {
  const t = props.calEvent.attendees[0].language.translate;
  return props.recurringEvent?.count && props.recurringEvent?.freq
    ? ` - ${t("every_for_freq", {
        freq: t(`${rrule.FREQUENCIES[props.recurringEvent.freq].toString().toLowerCase()}`),
      })} ${props.recurringEvent.count} ${t(
        `${rrule.FREQUENCIES[props.recurringEvent.freq].toString().toLowerCase()}`,
        { count: props.recurringEvent.count }
      )}`
    : "";
}

export function WhenInfo(props: {
  calEvent: CalendarEvent;
  recurringEvent: RecurringEvent;
  timeZone: string;
  t: TFunction;
}) {
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
            {props.recurringEvent?.count ? `${t("starting")} ` : ""}
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
