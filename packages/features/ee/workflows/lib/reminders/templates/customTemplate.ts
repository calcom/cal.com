import { guessEventLocationType } from "@calcom/app-store/locations";
import type { Dayjs } from "@calcom/dayjs";
import type { Prisma } from "@calcom/prisma/client";

export type VariablesType = {
  eventName?: string;
  organizerName?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  eventDate?: Dayjs;
  eventTime?: Dayjs;
  eventEndTime?: Dayjs;
  timeZone?: string;
  location?: string | null;
  additionalNotes?: string | null;
  customInputs?: Prisma.JsonValue;
  meetingUrl?: string;
};

const customTemplate = async (text: string, variables: VariablesType, locale: string) => {
  const translatedDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(variables.eventDate?.toDate());

  const timeWithTimeZone = `${variables.eventTime?.format("HH:mm")} (${variables.timeZone})`;

  const endTimeWithTimeZone = `${variables.eventEndTime?.format("HH:mm")} (${variables.timeZone})`;

  let locationString = variables.location || "";

  if (text.includes("{LOCATION}")) {
    locationString = guessEventLocationType(locationString)?.label || locationString;
  }

  let dynamicText = text
    .replaceAll("{EVENT_NAME}", variables.eventName || "")
    .replaceAll("{ORGANIZER}", variables.organizerName || "")
    .replaceAll("{ATTENDEE}", variables.attendeeName || "")
    .replaceAll("{ORGANIZER_NAME}", variables.organizerName || "") //old variable names
    .replaceAll("{ATTENDEE_NAME}", variables.attendeeName || "") //old variable names
    .replaceAll("{EVENT_DATE}", translatedDate)
    .replaceAll("{EVENT_TIME}", timeWithTimeZone)
    .replaceAll("{EVENT_END_TIME}", variables.timeZone || "")
    .replaceAll("{TIMEZONE_TIME}", endTimeWithTimeZone)
    .replaceAll("{LOCATION}", locationString)
    .replaceAll("{ADDITIONAL_NOTES}", variables.additionalNotes || "")
    .replaceAll("{ATTENDEE_EMAIL}", variables.attendeeEmail || "")
    .replaceAll("{TIMEZONE}", variables.timeZone || "")
    .replaceAll("{MEETING_URL}", variables.meetingUrl || "");

  const customInputvariables = dynamicText.match(/\{(.+?)}/g)?.map((variable) => {
    return variable.replace("{", "").replace("}", "");
  });

  //and event date/time with formatting
  customInputvariables?.forEach((variable) => {
    if (variable.startsWith("EVENT_DATE_")) {
      const dateFormat = variable.substring(11, text.length);
      const formattedDate = variables.eventDate?.format(dateFormat);
      dynamicText = dynamicText.replace(`{${variable}}`, formattedDate || "");
      return;
    }

    if (variable.startsWith("EVENT_TIME_")) {
      const dateFormat = variable.substring(11, text.length);
      const formattedDate = variables.eventTime?.format(dateFormat);
      dynamicText = dynamicText.replace(`{${variable}}`, formattedDate || "");
      return;
    }
    if (variable.startsWith("EVENT_END_TIME_")) {
      const dateFormat = variable.substring(15, text.length);
      const formattedDate = variables.eventEndTime?.format(dateFormat);
      dynamicText = dynamicText.replace(`{${variable}}`, formattedDate || "");
      return;
    }
    if (variables.customInputs) {
      Object.keys(variables.customInputs).forEach((customInput) => {
        const formatedToVariable = customInput
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .trim()
          .replaceAll(" ", "_")
          .toUpperCase();
        if (variable === formatedToVariable && variables.customInputs) {
          dynamicText = dynamicText.replace(
            `{${variable}}`,
            variables.customInputs[customInput as keyof typeof variables.customInputs]
          );
        }
      });
    }
  });

  const textHtml = `<body style="white-space: pre-wrap;">${dynamicText}</body>`;
  return { text: dynamicText, html: textHtml };
};

export default customTemplate;
