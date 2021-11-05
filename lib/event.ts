import { TFunction } from "next-i18next";

export type EventNameObjectType = {
  attendee: string | string[] | undefined;
  eventType: string;
  eventName: string | null;
  host: string;
  t: TFunction;
};

export function getEventName(eventNameObj: EventNameObjectType) {
  if (!eventNameObj.attendee || !(typeof eventNameObj.attendee === "string")) eventNameObj.attendee = ""; // If name is not set or is not of proper type
  return !eventNameObj.eventType
    ? eventNameObj.eventType.replace("{USER}", eventNameObj.attendee)
    : eventNameObj.eventName +
        " " +
        eventNameObj.t("between") +
        " " +
        eventNameObj.host +
        " " +
        eventNameObj.t("and") +
        " " +
        eventNameObj.attendee;
}
