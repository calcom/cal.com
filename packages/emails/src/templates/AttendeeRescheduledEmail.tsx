import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";
import React from 'react'

export const AttendeeRescheduledEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title="event_has_been_rescheduled"
    headerType="calendarCircle"
    subject="event_type_has_been_rescheduled_on_time_date"
    {...props}
  />
);
