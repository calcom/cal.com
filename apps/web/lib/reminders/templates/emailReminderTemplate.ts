import dayjs from "dayjs";

import { useLocale } from "@lib/hooks/useLocale";
import { linkValueToString } from "@lib/linkValueToString";

const emailReminderTemplate = (
  name: string,
  startTime: string,
  eventName: string,
  attendeeTimeZone: string,
  attendee: string
) => {
  const templateSubject = `Reminder: ${eventName} at ${dayjs(startTime).format("YYYY MMM D h:mmA")}`;
  const templateBody = `Hi ${name},\n\n This is a friendly reminder that your Meeting (${eventName}) with ${attendee} is at at ${dayjs(
    startTime
  ).format("YYYY MMM D h:mmA")} ${attendeeTimeZone}`;

  return [templateSubject, templateBody];
};

export default emailReminderTemplate;
