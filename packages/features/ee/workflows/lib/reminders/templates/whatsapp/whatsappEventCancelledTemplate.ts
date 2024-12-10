import dayjs from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

export const whatsappEventCancelledTemplate = (
  isEditingMode: boolean,
  locale: string,
  action?: WorkflowActions,
  timeFormat?: TimeFormat,
  startTime?: string,
  eventName?: string,
  timeZone?: string,
  attendee?: string,
  name?: string
) => {
  const currentTimeFormat = timeFormat || TimeFormat.TWELVE_HOUR;
  const dateTimeFormat = `ddd, MMM D, YYYY ${currentTimeFormat}`;

  let eventDate;
  if (isEditingMode) {
    eventName = "{EVENT_NAME}";
    timeZone = "{TIMEZONE}";
    startTime = `{START_TIME_${currentTimeFormat}}`;

    eventDate = `{EVENT_DATE_${dateTimeFormat}}`;
    attendee = action === WorkflowActions.WHATSAPP_ATTENDEE ? "{ORGANIZER}" : "{ATTENDEE}";
    name = action === WorkflowActions.WHATSAPP_ATTENDEE ? "{ATTENDEE}" : "{ORGANIZER}";
  } else {
    eventDate = dayjs(startTime).tz(timeZone).locale(locale).format("YYYY MMM D");
    startTime = dayjs(startTime).tz(timeZone).locale(locale).format(currentTimeFormat);
  }

  const templateOne = `Hi${
    name ? ` ${name}` : ``
  }, your meeting (*${eventName}*) with ${attendee} on ${eventDate} at ${startTime} ${timeZone} has been canceled.`;

  //Twilio supports up to 1024 characters for whatsapp template messages
  if (templateOne.length <= 1024) return templateOne;

  return null;
};
