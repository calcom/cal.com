import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

const BrokenIntegration = () => {
  return (
    <div>
      {
        "We couldn't add the Zoom meeting link to your scheduled event. Contact your invitees or update your calendar event to add the details. You can either"
      }{" "}
      <a href="https://cal.com">change your location on the event type</a> or{" "}
      <a href="https://cal.com/apps">try readding the location</a>.
    </div>
  );
};

export const BrokenIntegrationEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const t = props.calEvent.organizer.language.translate;
  return (
    <BaseScheduledEmail
      timeZone={props.calEvent.organizer.timeZone}
      t={t}
      subject="Broken Integration"
      title="This integration is broken"
      subtitle={<BrokenIntegration />}
      {...props}
    />
  );
};
