import type { CalendarEvent, Person, RecurringEvent } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

export const OrganizerScheduledEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    recurringEvent: RecurringEvent;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const t = props.calEvent.organizer.language.translate;
  return (
    <BaseScheduledEmail
      timeZone={props.calEvent.organizer.timeZone}
      t={t}
      subject={t("confirmed_event_type_subject")}
      title={t(props.recurringEvent?.count ? "new_event_scheduled_recurring" : "new_event_scheduled")}
      {...props}
    />
  );
};
