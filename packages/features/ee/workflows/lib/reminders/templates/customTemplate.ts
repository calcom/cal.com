import { guessEventLocationType } from "@calcom/app-store/locations";
import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalEventResponses } from "@calcom/types/Calendar";

export type WorkflowVariableResponses = Record<
  string,
  {
    value:
      | string
      | number
      | boolean
      | string[]
      | Record<string, string>
      | { value: string; optionValue: string };
  }
>;

export function transformBookingResponsesToVariableFormat(
  responses: CalEventResponses | null | undefined
): WorkflowVariableResponses | null {
  if (!responses) return null;

  const transformed: WorkflowVariableResponses = {};

  for (const [key, response] of Object.entries(responses)) {
    if (response?.value !== undefined) {
      transformed[key] = {
        value: response.value,
      };
    }
  }

  return Object.keys(transformed).length > 0 ? transformed : null;
}

export function transformRoutingFormResponsesToVariableFormat(
  responses: FORM_SUBMITTED_WEBHOOK_RESPONSES | null | undefined
): WorkflowVariableResponses | null {
  if (!responses) return null;

  const transformed: WorkflowVariableResponses = {};

  for (const [key, response] of Object.entries(responses)) {
    if (response?.value !== undefined) {
      transformed[key] = {
        value: response.value,
      };
    }
  }

  return Object.keys(transformed).length > 0 ? transformed : null;
}

export function formatIdentifierToVariable(key: string): string {
  return key
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .replaceAll(" ", "_")
    .toUpperCase();
}

export type VariablesType = {
  eventName?: string;
  organizerName?: string;
  attendeeName?: string;
  attendeeFirstName?: string;
  attendeeLastName?: string;
  attendeeEmail?: string;
  eventDate?: Dayjs;
  eventEndTime?: Dayjs;
  timeZone?: string;
  location?: string | null;
  additionalNotes?: string | null;
  responses?: WorkflowVariableResponses | null;
  meetingUrl?: string;
  cancelLink?: string;
  cancelReason?: string | null;
  rescheduleLink?: string;
  rescheduleReason?: string | null;
  ratingUrl?: string;
  noShowUrl?: string;
  attendeeTimezone?: string;
  eventTimeInAttendeeTimezone?: Dayjs;
  eventEndTimeInAttendeeTimezone?: Dayjs;
};

// Replaces placeholders like {EVENT_NAME_VARIABLE} with {EVENT_NAME}
function replaceVariablePlaceholders(text: string) {
  return text.replace(/\{([A-Z0-9_]+)_VARIABLE}/g, (_, base) => `{${base}}`);
}

const customTemplate = (
  text: string,
  variables: VariablesType,
  locale: string,
  timeFormat?: TimeFormat,
  isBrandingDisabled?: boolean
) => {
  const eventDate = variables.eventDate;
  const translatedDate = eventDate
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(eventDate.add(dayjs().tz(variables.timeZone).utcOffset(), "minute").toDate())
    : "";

  let locationString = variables.location || "";

  text = replaceVariablePlaceholders(text);

  if (text.includes("{LOCATION}")) {
    locationString = guessEventLocationType(locationString)?.label || locationString;
  }

  const cancelLink = variables.cancelLink ?? "";
  const rescheduleLink = variables.rescheduleLink ?? "";

  const currentTimeFormat = timeFormat || TimeFormat.TWELVE_HOUR;

  const attendeeNameWords = variables.attendeeName?.trim().split(" ");
  const attendeeNameWordCount = attendeeNameWords?.length ?? 0;

  const attendeeFirstName = variables.attendeeFirstName
    ? variables.attendeeFirstName
    : attendeeNameWords?.[0] ?? "";

  const attendeeLastName = variables.attendeeLastName
    ? variables.attendeeLastName
    : attendeeNameWordCount > 1
    ? attendeeNameWords![attendeeNameWordCount - 1]
    : "";

  let dynamicText = text
    .replaceAll("{EVENT_NAME}", variables.eventName || "")
    .replaceAll("{ORGANIZER}", variables.organizerName || "")
    .replaceAll("{ATTENDEE}", variables.attendeeName || "")
    .replaceAll("{ORGANIZER_NAME}", variables.organizerName || "") //old variable names
    .replaceAll("{ATTENDEE_NAME}", variables.attendeeName || "") //old variable names
    .replaceAll("{ATTENDEE_FIRST_NAME}", attendeeFirstName)
    .replaceAll("{ATTENDEE_LAST_NAME}", attendeeLastName)
    .replaceAll("{EVENT_DATE}", translatedDate)
    .replaceAll("{EVENT_TIME}", variables.eventDate?.format(currentTimeFormat) || "")
    .replaceAll("{START_TIME}", variables.eventDate?.format(currentTimeFormat) || "")
    .replaceAll("{EVENT_END_TIME}", variables.eventEndTime?.format(currentTimeFormat) || "")
    .replaceAll("{LOCATION}", locationString)
    .replaceAll("{ADDITIONAL_NOTES}", variables.additionalNotes || "")
    .replaceAll("{ATTENDEE_EMAIL}", variables.attendeeEmail || "")
    .replaceAll("{TIMEZONE}", variables.timeZone || "")
    .replaceAll("{CANCEL_URL}", cancelLink)
    .replaceAll("{CANCELLATION_REASON}", variables.cancelReason || "")
    .replaceAll("{RESCHEDULE_URL}", rescheduleLink)
    .replaceAll("{RESCHEDULE_REASON}", variables.rescheduleReason || "")
    .replaceAll("{MEETING_URL}", variables.meetingUrl || "")
    .replaceAll("{RATING_URL}", variables.ratingUrl || "")
    .replaceAll("{NO_SHOW_URL}", variables.noShowUrl || "")
    .replaceAll("{ATTENDEE_TIMEZONE}", variables.attendeeTimezone || "")
    .replaceAll(
      "{EVENT_START_TIME_IN_ATTENDEE_TIMEZONE}",
      variables.eventTimeInAttendeeTimezone?.format(currentTimeFormat) || ""
    )
    .replaceAll(
      "{EVENT_END_TIME_IN_ATTENDEE_TIMEZONE}",
      variables.eventEndTimeInAttendeeTimezone?.format(currentTimeFormat) || ""
    );

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
      const formattedDate = variables.eventDate?.locale(locale).format(dateFormat);
      dynamicText = dynamicText.replace(`{${variable}}`, formattedDate || "");
      return;
    }

    if (variable.startsWith("EVENT_END_TIME_")) {
      const dateFormat = variable.substring(15, text.length);
      const formattedDate = variables.eventEndTime?.locale(locale).format(dateFormat);
      dynamicText = dynamicText.replace(`{${variable}}`, formattedDate || "");
      return;
    }

    // handle custom variables from form/booking responses
    if (variables.responses) {
      Object.keys(variables.responses).forEach((customInput) => {
        const formatedToVariable = formatIdentifierToVariable(customInput);

        if (variable === formatedToVariable && variables.responses) {
          const response = variables.responses[customInput];
          if (response?.value !== undefined) {
            const responseValue = response.value;
            const valueString = Array.isArray(responseValue)
              ? responseValue.join(", ")
              : String(responseValue);

            dynamicText = dynamicText.replace(`{${variable}}`, valueString);
          }
        }
      });
    }
  });

  const branding = !isBrandingDisabled ? `<br><br>_<br><br>Scheduling by ${APP_NAME}` : "";

  const textHtml = `<body style="white-space: pre-wrap;">${dynamicText}${branding}</body>`;
  return { text: dynamicText, html: textHtml };
};

export default customTemplate;
