// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import type { CalendarEvent } from "@calcom/types/Calendar";

// format CalEvent to remove platformClientId from email addresses
const formatClientIdFromEmails = (calEvent: CalendarEvent, clientId: string) => {
  const attendees = calEvent.attendees.map((attendee) => ({
    ...attendee,
    email: attendee.email.replace(`+${clientId}`, ""),
  }));
  const organizer = {
    ...calEvent.organizer,
    email: calEvent.organizer.email.replace(`+${clientId}`, ""),
  };
  return [attendees, organizer];
};

export const formatCalEvent = (calEvent: CalendarEvent) => {
  const clonedEvent = cloneDeep(calEvent);
  if (clonedEvent.platformClientId) {
    const [attendees, organizer] = formatClientIdFromEmails(clonedEvent, clonedEvent.platformClientId);
    Object.assign(clonedEvent, { attendees, organizer });
  }

  return clonedEvent;
};
