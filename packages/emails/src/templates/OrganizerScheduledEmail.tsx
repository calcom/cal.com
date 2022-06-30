import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

export const OrganizerScheduledEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    newSeat?: boolean;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  let title;
  switch (title) {
    case props.calEvent.recurringEvent?.count:
      title = "new_event_scheduled_recurring";
      break;

    case props.newSeat:
      title = "new_seat";
      break;
    default:
      title = "new_event_scheduled";
  }

  const t = props.calEvent.organizer.language.translate;
  return (
    <BaseScheduledEmail
      timeZone={props.calEvent.organizer.timeZone}
      t={t}
      subject={t("confirmed_event_type_subject")}
      title={t(title)}
      {...props}
    />
  );
};
