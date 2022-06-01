import type { CalendarEvent, Person, RecurringEvent } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

export const AttendeeScheduledEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    recurringEvent: RecurringEvent;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  return (
    <BaseScheduledEmail timeZone={props.attendee.timeZone} t={props.attendee.language.translate} {...props} />
  );
};
