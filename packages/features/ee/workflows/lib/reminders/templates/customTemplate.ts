import { guessEventLocationType } from "@calcom/app-store/locations";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import type { CalEventResponses } from "@calcom/types/Calendar";

export type VariablesType = {
  eventName?: string;
  organizerName?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  eventDate?: Dayjs;
  eventEndTime?: Dayjs;
  timeZone?: string;
  location?: string | null;
  additionalNotes?: string | null;
  responses?: CalEventResponses | null;
  meetingUrl?: string;
  cancelLink?: string;
  rescheduleLink?: string;
};

const customTemplate = (
  text: string,
  variables: VariablesType,
  locale: string,
  isBrandingDisabled?: boolean
) => {
  const translatedDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(variables.eventDate?.add(dayjs().tz(variables.timeZone).utcOffset(), "minute").toDate());

  let locationString = variables.location || "";

  if (text.includes("{LOCATION}")) {
    locationString = guessEventLocationType(locationString)?.label || locationString;
  }

  const cancelLink = variables.cancelLink ? `${WEBAPP_URL}${variables.cancelLink}` : "";
  const rescheduleLink = variables.rescheduleLink ? `${WEBAPP_URL}${variables.rescheduleLink}` : "";

  let dynamicText = text
    .replaceAll("{EVENT_NAME}", variables.eventName || "")
    .replaceAll("{ORGANIZER}", variables.organizerName || "")
    .replaceAll("{ATTENDEE}", variables.attendeeName || "")
    .replaceAll("{ORGANIZER_NAME}", variables.organizerName || "") //old variable names
    .replaceAll("{ATTENDEE_NAME}", variables.attendeeName || "") //old variable names
    .replaceAll("{EVENT_DATE}", translatedDate)
    .replaceAll("{EVENT_TIME}", variables.eventDate?.format("H:mmA") || "")
    .replaceAll("{START_TIME}", variables.eventDate?.format("H:mmA") || "")
    .replaceAll("{EVENT_END_TIME}", variables.eventEndTime?.format("H:mmA") || "")
    .replaceAll("{LOCATION}", locationString)
    .replaceAll("{ADDITIONAL_NOTES}", variables.additionalNotes || "")
    .replaceAll("{ATTENDEE_EMAIL}", variables.attendeeEmail || "")
    .replaceAll("{TIMEZONE}", variables.timeZone || "")
    .replaceAll("{CANCEL_URL}", cancelLink)
    .replaceAll("{RESCHEDULE_URL}", rescheduleLink)
    .replaceAll("{MEETING_URL}", variables.meetingUrl || "");

  const customInputvariables = dynamicText.match(/\{(.+?)}/g)?.map((variable) => {
    return variable.replace("{", "").replace("}", "");
  });

  // event date/time with formatting
  customInputvariables?.forEach((variable) => {
    if (
      variable.startsWith("EVENT_DATE_") ||
      variable.startsWith("EVENT_TIME_") ||
      variable.startsWith("START_TIME_")
    ) {
      const dateFormat = variable.substring(11, text.length);
      const formattedDate = variables.eventDate?.format(dateFormat);
      dynamicText = dynamicText.replace(`{${variable}}`, formattedDate || "");
      return;
    }

    if (variable.startsWith("EVENT_END_TIME_")) {
      const dateFormat = variable.substring(15, text.length);
      const formattedDate = variables.eventEndTime?.format(dateFormat);
      dynamicText = dynamicText.replace(`{${variable}}`, formattedDate || "");
      return;
    }

    if (variables.responses) {
      Object.keys(variables.responses).forEach((customInput) => {
        const formatedToVariable = customInput
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .trim()
          .replaceAll(" ", "_")
          .toUpperCase();

        if (
          variable === formatedToVariable &&
          variables.responses &&
          variables.responses[customInput as keyof typeof variables.responses].value
        ) {
          dynamicText = dynamicText.replace(
            `{${variable}}`,
            variables.responses[customInput as keyof typeof variables.responses].value.toString()
          );
        }
      });
    }
  });

  const branding = !isBrandingDisabled ? `<br><br>_<br><br>Scheduling by ${APP_NAME}` : "";

  const textHtml = `<body style="white-space: pre-wrap;">${dynamicText}${branding}</body>`;
  return { text: dynamicText, html: textHtml };
};

export default customTemplate;
