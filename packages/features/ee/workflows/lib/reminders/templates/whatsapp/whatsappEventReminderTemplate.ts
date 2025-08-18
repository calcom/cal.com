import dayjs from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";

export const whatsappReminderTemplate = (
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
  }, this is a reminder that your meeting (*${eventName}*) with ${attendee} is on ${eventDate} at ${startTime} ${timeZone}.`;

  //Twilio supports up to 1024 characters for whatsapp template messages
  if (templateOne.length <= 1024) return templateOne;

  return null;
};

export const plainTextTemplate =
  "Hi {ATTENDEE}, this is a reminder that your meeting (*{EVENT_NAME}*) with {ORGANIZER} is on {EVENT_DATE_ddd, MMM D, YYYY h:mma} at {START_TIME_h:mma} {TIMEZONE}.";
