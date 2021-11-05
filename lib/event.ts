import { TFunction } from "next-i18next";

type EventNameObjectType = {
  attendeeName?: string | string[];
  eventType: string;
  eventName: string | null;
  host: string;
  t: TFunction;
};

export function getEventName(eventNameObj: EventNameObjectType) {
  if (!eventNameObj.attendeeName || !(typeof eventNameObj.attendeeName === "string"))
    eventNameObj.attendeeName = "";
  return eventNameObj.eventName
    ? eventNameObj.eventName.replace("{USER}", eventNameObj.attendeeName)
    : eventNameObj.t("event_between_users", {
        eventName: eventNameObj.eventType,
        host: eventNameObj.host,
        attendeeName: eventNameObj.attendeeName,
      });
}
