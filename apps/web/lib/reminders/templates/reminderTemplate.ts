import dayjs from "dayjs";

import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";

const reminderTemplate = (evt: CalendarEvent) => {
  return `Hi, this is a reminder that you have a ${evt.title} with 
  ${evt.organizer.name} at ${dayjs(evt.startTime).format("YYYY MMMM DD h:mmA")} ${evt.attendees[0].timeZone}`;
};

export default reminderTemplate;
