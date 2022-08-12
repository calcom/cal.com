import { TFunction } from "next-i18next";

type EventNameObjectType = {
  attendeeName: string;
  eventType: string;
  eventName?: string | null;
  host: string;
  location?: string;
  t: TFunction;
};

export function getEventName(eventNameObj: EventNameObjectType, forAttendeeView = false) {
  if (!eventNameObj.eventName)
    return eventNameObj.t("event_between_users", {
      eventName: eventNameObj.eventType,
      host: eventNameObj.host,
      attendeeName: eventNameObj.attendeeName,
    });

  let eventName = eventNameObj.eventName;
  let locationString = "";

  if (eventNameObj.eventName.includes("{LOCATION}")) {
    switch (eventNameObj.location) {
      case "inPerson":
        locationString = "In Person";
        break;
      case "userPhone":
      case "phone":
        locationString = "Phone";
        break;
      case "integrations:daily":
        locationString = "Cal Video";
        break;
      case "integrations:zoom":
        locationString = "Zoom";
        break;
      case "integrations:huddle01":
        locationString = "Huddle01";
        break;
      case "integrations:tandem":
        locationString = "Tandem";
        break;
      case "integrations:office365_video":
        locationString = "MS Teams";
        break;
      case "integrations:jitsi":
        locationString = "Jitsi";
        break;
    }
    eventName = eventName.replace("{LOCATION}", locationString);
  }

  return (
    eventName
      // Need this for compatibility with older event names
      .replace("{USER}", eventNameObj.attendeeName)
      .replace("{ATTENDEE}", eventNameObj.attendeeName)
      .replace("{HOST}", eventNameObj.host)
      .replace("{HOST/ATTENDEE}", forAttendeeView ? eventNameObj.host : eventNameObj.attendeeName)
  );
}
