import { AppStoreLocationType } from "@calcom/app-store/locations";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

// https://stackoverflow.com/questions/56263980/get-key-of-an-enum-from-its-value-in-typescript
export function getEnumKeyByEnumValue(myEnum: any, enumValue: number | string): string {
  const keys = Object.keys(myEnum).filter((x) => myEnum[x] == enumValue);
  return keys.length > 0 ? keys[0] : "";
}

const BrokenIntegration = (props: { location: string }) => {
  return (
    <div>
      {`We couldn't add the ${props.location} meeting link to your scheduled event. Contact your invitees or update your calendar event to add the details. You can either`}{" "}
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
  let location = props.calEvent.location
    ? getEnumKeyByEnumValue(AppStoreLocationType, props.calEvent.location)
    : " ";

  if (location === "GoogleMeet") {
    location = location.slice(0, 5) + " " + location.slice(5);
  }

  const t = props.calEvent.organizer.language.translate;
  return (
    <BaseScheduledEmail
      timeZone={props.calEvent.organizer.timeZone}
      t={t}
      subject="Broken Integration"
      title="There was a problem adding a video link"
      subtitle={<BrokenIntegration location={location} />}
      headerType="xCircle"
      {...props}
    />
  );
};
