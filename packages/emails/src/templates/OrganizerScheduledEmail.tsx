import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

export const OrganizerScheduledEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    newSeat?: boolean;
    teamMember?: Person;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  let subject;
  let title;

  if (props.newSeat) {
    subject = "new_seat_subject";
  } else {
    subject = "confirmed_event_type_subject";
  }

  if (props.calEvent.recurringEvent?.count) {
    title = "new_event_scheduled_recurring";
  } else if (props.newSeat) {
    title = "new_seat_title";
  } else {
    title = "new_event_scheduled";
  }

  const t = props.teamMember?.language.translate || props.calEvent.organizer.language.translate;
  return (
    <BaseScheduledEmail
      timeZone={props.teamMember?.timeZone || props.calEvent.organizer.timeZone}
      t={t}
      subject={t(subject)}
      title={t(title)}
      includeAppsStatus
      {...props}
    />
  );
};
