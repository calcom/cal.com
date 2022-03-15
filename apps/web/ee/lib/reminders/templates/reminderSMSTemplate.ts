import dayjs from "dayjs";

import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";

const reminderTemplate = (
  title: string,
  organizerName: string,
  startTime: string,
  attendeeTimeZone: string
) => {
  return `Hi, this is a reminder that you have a ${title} with 
  ${organizerName} at ${dayjs(startTime).format("YYYY MMMM DD h:mmA")} ${attendeeTimeZone}`;
};

export default reminderTemplate;
