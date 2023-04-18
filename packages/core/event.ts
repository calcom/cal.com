import { TFunction } from "next-i18next";

import { guessEventLocationType } from "@calcom/app-store/locations";

export type EventNameObjectType = {
  attendeeName: string;
  eventType: string;
  eventName?: string | null;
  host: string;
  location?: string;
  t: TFunction;
};

export function getEventName(eventNameObj: EventNameObjectType) {
  if (!eventNameObj.eventName)
    return eventNameObj.t("event_between_users", {
      eventName: eventNameObj.eventType,
      host: eventNameObj.host,
      attendeeName: eventNameObj.attendeeName,
    });

  let eventName = eventNameObj.eventName;
  let locationString = eventNameObj.location || "";

  if (eventNameObj.eventName.includes("{Location}")) {
    const eventLocationType = guessEventLocationType(eventNameObj.location);
    if (eventLocationType) {
      locationString = eventLocationType.label;
    }
    eventName = eventName.replace("{Location}", locationString);
  }

  return (
    eventName
      // Need this for compatibility with older event names
      .replace("{Event type title}", eventNameObj.eventType)
      .replace("{Scheduler}", eventNameObj.attendeeName)
      .replace("{Organiser}", eventNameObj.host)
  );
}
