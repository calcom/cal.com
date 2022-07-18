export type DynamicVariablesType = {
  eventName?: string;
  organizerName?: string;
  attendeeName?: string;
  eventDate?: string;
  eventTime?: string;
  timeZone?: string;
  location?: string | null;
};

const customTemplate = (text: string, dynamicVariables: DynamicVariablesType) => {
  const timeWithTimeZone = `${dynamicVariables.eventTime} (${dynamicVariables.timeZone})`;
  let locationString = dynamicVariables.location || "";
  if (text.includes("{LOCATION}")) {
    switch (dynamicVariables.location) {
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
      case "integrations:whereby_video":
        locationString = "Whereby";
        break;
      case "integrations:around_video":
        locationString = "Around";
        break;
      case "integrations:riverside_video":
        locationString = "Riverside";
        break;
    }
  }

  return text
    .replace("{EVENT_NAME}", dynamicVariables.eventName || "")
    .replace("{ORGANIZER_NAME}", dynamicVariables.organizerName || "")
    .replace("{ATTENDEE_NAME}", dynamicVariables.attendeeName || "")
    .replace("{EVENT_DATE}", dynamicVariables.eventDate || "")
    .replace("{EVENT_TIME}", timeWithTimeZone)
    .replace("{LOCATION}", locationString);
};

export default customTemplate;
