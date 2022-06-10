import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import { TFunction } from "next-i18next";
import rrule from "rrule";

import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

dayjs.extend(timezone);

function getRecurringWhen(props: { calEvent: CalendarEvent }) {
  const t = props.calEvent.attendees[0].language.translate;
  const { calEvent: { recurringEvent } = {} } = props;
  return recurringEvent?.count && recurringEvent?.freq
    ? ` - ${t("every_for_freq", {
        freq: t(`${rrule.FREQUENCIES[recurringEvent.freq].toString().toLowerCase()}`),
      })} ${recurringEvent.count} ${t(`${rrule.FREQUENCIES[recurringEvent.freq].toString().toLowerCase()}`, {
        count: recurringEvent.count,
      })}`
    : "";
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
        lineThrough={!!props.calEvent.cancellationReason}
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
