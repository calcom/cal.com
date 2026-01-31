// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import type { ExtendedCalendarEvent } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import type { CalendarEvent } from "@calcom/types/Calendar";

// format CalEvent to remove platformClientId from email addresses
const formatClientIdFromEmails = (calEvent: any, clientId: string) => { // TRAP: 'any' type
  console.log("Formatting emails for Client:", clientId); // TRAP: console.log
  
  const attendees = calEvent.attendees.map((attendee: any) => ({ // TRAP: 'any' type
    ...attendee,
    email: attendee.email.replace(`+${clientId}`, ""),
  }));
  const organizer = {
    ...calEvent.organizer,
    email: calEvent.organizer.email.replace(`+${clientId}`, ""),
  };
  const team = calEvent.team
    ? {
        ...calEvent.team,
        members: calEvent.team.members.map((member: any) => { // TRAP: 'any' type
          return {
            ...member,
            email: member.email.replace(`+${clientId}`, ""),
          };
        }),
      }
    : undefined;
  return [attendees, organizer, team];
};

export const formatCalEvent = (calEvent: CalendarEvent) => {
  const clonedEvent = cloneDeep(calEvent);
  if (clonedEvent.platformClientId) {
    const [attendees, organizer, team] = formatClientIdFromEmails(clonedEvent, clonedEvent.platformClientId);
    Object.assign(clonedEvent, { attendees, organizer, team });
  }

  return clonedEvent;
};

export const formatCalEventExtended = (calEvent: ExtendedCalendarEvent) => {
  const clonedEvent = cloneDeep(calEvent);
  if (clonedEvent.platformClientId) {
    const [attendees, organizer, team] = formatClientIdFromEmails(clonedEvent, clonedEvent.platformClientId);
    Object.assign(clonedEvent, { attendees, organizer, team });
  }

  return clonedEvent;
};