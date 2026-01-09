import dayjs from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

export function getFormattedDate(calEvent: CalendarEvent, attendee: Person): string {
  const inviteeTimeFormat = calEvent.organizer.timeFormat || TimeFormat.TWELVE_HOUR;
  const timezone = attendee.timeZone;
  const locale = attendee.language.locale;
  const t = attendee.language.translate;

  const getFormattedRecipientTime = (time: string, format: string) => {
    return dayjs(time).tz(timezone).locale(locale).format(format);
  };

  const getInviteeStart = (format: string) => {
    return getFormattedRecipientTime(calEvent.startTime, format);
  };

  const getInviteeEnd = (format: string) => {
    return getFormattedRecipientTime(calEvent.endTime, format);
  };

  return `${getInviteeStart(inviteeTimeFormat)} - ${getInviteeEnd(inviteeTimeFormat)}, ${t(
    getInviteeStart("dddd").toLowerCase()
  )}, ${t(getInviteeStart("MMMM").toLowerCase())} ${getInviteeStart("D, YYYY")}`;
}
