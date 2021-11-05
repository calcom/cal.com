export type EventNameObjectType = {
  attendee: string | string[] | undefined;
  eventType: string;
  eventName: string | null;
  host: string;
};

export function getEventName(eventNameObj: EventNameObjectType) {
  console.log("event:", eventNameObj);
  if (!eventNameObj.attendee || !(typeof eventNameObj.attendee === "string")) eventNameObj.attendee = ""; // If name is not set or is not of proper type
  return !eventNameObj.eventType
    ? eventNameObj.eventType.replace("{USER}", eventNameObj.attendee)
    : eventNameObj.eventName + " between " + eventNameObj.host + " and " + eventNameObj.attendee;
}
