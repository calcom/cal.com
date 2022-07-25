import { getTranslation } from "@server/lib/i18n";

export type VariablesType = {
  eventName?: string;
  organizerName?: string;
  attendeeName?: string;
  eventDate?: string;
  eventTime?: string;
  timeZone?: string;
  location?: string | null;
};

const customTemplate = async (text: string, variables: VariablesType, locale: string) => {
  const t = await getTranslation(locale ?? "en", "common");

  const timeWithTimeZone = `${variables.eventTime} (${variables.timeZone})`;
  let locationString = variables.location || "";

  if (text.includes("{LOCATION}")) {
    switch (variables.location) {
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

  const dynamicText = text
    .replaceAll("{EVENT_NAME}", variables.eventName || "")
    .replaceAll("{ORGANIZER_NAME}", variables.organizerName || "")
    .replaceAll("{ATTENDEE_NAME}", variables.attendeeName || "")
    .replaceAll("{EVENT_DATE}", variables.eventDate || "")
    .replaceAll("{EVENT_TIME}", timeWithTimeZone)
    .replaceAll("{LOCATION}", locationString);

  const textHtml = `<body style="white-space: pre-wrap;">${dynamicText}</body>`;
  return { text: dynamicText, html: textHtml };
};

export default customTemplate;
