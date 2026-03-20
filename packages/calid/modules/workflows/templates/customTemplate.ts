import { guessEventLocationType } from "@calcom/app-store/locations";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalEventResponses } from "@calcom/types/Calendar";

export type VariablesType = {
  eventTypeName?: string;
  eventName?: string;
  organizerName?: string;
  organizerFirstName?: string;
  attendeeName?: string;
  attendeeFirstName?: string;
  attendeeLastName?: string;
  attendeeEmail?: string;
  eventDate?: string;
  eventStartTime?: Dayjs;
  eventEndTime?: Dayjs;
  timezone?: string;
  location?: string | null;
  additionalNotes?: string | null;
  responses?: CalEventResponses | null;
  meetingUrl?: string;
  onlineMeetingUrl?: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
  ratingUrl?: string;
  noShowUrl?: string;
  attendeeTimezone?: string;
  eventStartTimeInAttendeeTimezone?: Dayjs;
  eventEndTimeInAttendeeTimezone?: Dayjs;
  eventTime?: string;
  cancellationReason?: string;
  eventTimeFormatted?: string;
};

interface ProcessingConfiguration {
  sourceText: string;
  dataVariables: VariablesType;
  culturalLocale: string;
  clockDisplay?: TimeFormat;
  brandingSuppressionFlag?: boolean;
}

interface TemplateOutput {
  text: string;
  html: string;
}

const establishTimeDisplayFormat = (providedFormat?: TimeFormat): TimeFormat => {
  return providedFormat ?? TimeFormat.TWELVE_HOUR;
};

const extractAttendeeNameComponents = (fullName?: string, firstName?: string, lastName?: string) => {
  const nameSegments = fullName?.trim().split(" ");
  const segmentCount = nameSegments?.length ?? 0;

  const derivedFirstName = firstName || nameSegments?.[0] || "";
  const derivedLastName = lastName || (segmentCount > 1 ? nameSegments![segmentCount - 1] : "");

  return {
    firstNameComponent: derivedFirstName,
    lastNameComponent: derivedLastName,
  };
};

const generateLocalizedDateString = (locale: string, eventTimestamp?: Dayjs, timezone?: string): string => {
  if (!eventTimestamp) return "";

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(eventTimestamp.add(dayjs().tz(timezone).utcOffset(), "minute").toDate());
};

const resolveLocationDisplayValue = (locationData?: string | null, hasLocationToken?: boolean): string => {
  if (!locationData) return "";

  return hasLocationToken ? guessEventLocationType(locationData)?.label || locationData : locationData;
};

const performBasicTokenSubstitution = (
  textContent: string,
  variables: VariablesType,
  timeFormat: TimeFormat,
  nameComponents: { firstNameComponent: string; lastNameComponent: string },
  localizedDate: string,
  locationValue: string
): string => {
  const cancellationUrl = variables.cancelUrl ?? "";
  const reschedulingUrl = variables.rescheduleUrl ?? "";

  // REVIEW: This mapping can be optimized by iterating through the variables object keys and performing dynamic replacements, rather than hardcoding each token replacement.
  return textContent
    .replaceAll("{EVENT_TYPE_NAME}", variables.eventTypeName || "")
    .replaceAll("{EVENT_NAME}", variables.eventName || "")
    .replaceAll("{ORGANIZER}", variables.organizerName || "")
    .replaceAll("{ATTENDEE}", variables.attendeeName || "")
    .replaceAll("{ORGANIZER_NAME}", variables.organizerName || "")
    .replaceAll("{ATTENDEE_NAME}", variables.attendeeName || "")
    .replaceAll("{ATTENDEE_FIRST_NAME}", nameComponents.firstNameComponent)
    .replaceAll("{ATTENDEE_LAST_NAME}", nameComponents.lastNameComponent)
    .replaceAll("{EVENT_DATE}", localizedDate)
    .replaceAll("{EVENT_TIME}", variables.eventStartTime?.format(timeFormat) || "")
    .replaceAll("{START_TIME}", variables.eventStartTime?.format(timeFormat) || "")
    .replaceAll("{EVENT_END_TIME}", variables.eventEndTime?.format(timeFormat) || "")
    .replaceAll("{LOCATION}", locationValue)
    .replaceAll("{ADDITIONAL_NOTES}", variables.additionalNotes || "")
    .replaceAll("{ATTENDEE_EMAIL}", variables.attendeeEmail || "")
    .replaceAll("{TIMEZONE}", variables.timezone || "")
    .replaceAll("{CANCEL_URL}", cancellationUrl)
    .replaceAll("{RESCHEDULE_URL}", reschedulingUrl)
    .replaceAll("{MEETING_URL}", variables.meetingUrl || "")
    .replaceAll("{ONLINE_MEETING_URL}", variables.onlineMeetingUrl || "")
    .replaceAll("{RATING_URL}", variables.ratingUrl || "")
    .replaceAll("{NO_SHOW_URL}", variables.noShowUrl || "")
    .replaceAll("{ATTENDEE_TIMEZONE}", variables.attendeeTimezone || "")
    .replaceAll(
      "{EVENT_START_TIME_IN_ATTENDEE_TIMEZONE}",
      variables.eventStartTimeInAttendeeTimezone?.format(timeFormat) || ""
    )
    .replaceAll(
      "{EVENT_END_TIME_IN_ATTENDEE_TIMEZONE}",
      variables.eventEndTimeInAttendeeTimezone?.format(timeFormat) || ""
    )
    .replaceAll("{CANCELLATION_REASON}", variables.cancellationReason || "");
};

const extractCustomTokens = (textContent: string): string[] => {
  return (
    textContent.match(/\{(.+?)}/g)?.map((token) => {
      return token.replace("{", "").replace("}", "");
    }) || []
  );
};

const processDateTimeTokens = (
  textContent: string,
  tokenList: string[],
  variables: VariablesType,
  locale: string
): string => {
  let processedText = textContent;

  tokenList.forEach((token) => {
    if (
      token.startsWith("EVENT_DATE_") ||
      token.startsWith("EVENT_TIME_") ||
      token.startsWith("START_TIME_")
    ) {
      const formatSpecification = token.substring(11, textContent.length);
      const formattedTimestamp = variables.eventStartTime?.locale(locale).format(formatSpecification);
      processedText = processedText.replace(`{${token}}`, formattedTimestamp || "");
      return;
    }

    if (token.startsWith("EVENT_END_TIME_")) {
      const formatSpecification = token.substring(15, textContent.length);
      const formattedTimestamp = variables.eventEndTime?.locale(locale).format(formatSpecification);
      processedText = processedText.replace(`{${token}}`, formattedTimestamp || "");
      return;
    }
  });

  return processedText;
};

const processCustomResponseTokens = (
  textContent: string,
  tokenList: string[],
  variables: VariablesType
): string => {
  let processedText = textContent;
  
  const responses = variables.responses

  if (!responses) return processedText;

  tokenList.forEach((token) => {
    if (token.startsWith("RESPONSES.")) {
      const path = token.slice("RESPONSES.".length).split(".");
      let value: unknown = variables.responses;
      for (const segment of path) {
        if (!value || typeof value !== "object") {
          value = undefined;
          break;
        }
        value = (value as Record<string, unknown>)[segment];
      }
      if (value !== undefined && value !== null) {
        processedText = processedText.replaceAll(`{${token}}`, String(value));
      }
      return;
    }

    Object.keys(responses).forEach((responseKey) => {
      const normalizedToken = responseKey
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .trim()
        .replaceAll(" ", "_")
        .toUpperCase();

      if (
        token === normalizedToken &&
        responses[responseKey as keyof typeof variables.responses]?.value
      ) {
        processedText = processedText.replace(
          `{${token}}`,
          responses[responseKey as keyof typeof variables.responses].value.toString()
        );
      }
    });
  });

  return processedText;
};

const UPPER_CASE_TO_VARIABLES_KEY: Record<string, keyof VariablesType> = {
  EVENT_TYPE_NAME: "eventTypeName",
  EVENT_NAME: "eventName",
  ORGANIZER_NAME: "organizerName",
  ORGANIZER_FIRST_NAME: "organizerFirstName",
  ATTENDEE_NAME: "attendeeName",
  ATTENDEE_FIRST_NAME: "attendeeFirstName",
  ATTENDEE_LAST_NAME: "attendeeLastName",
  ATTENDEE_EMAIL: "attendeeEmail",
  EVENT_DATE: "eventDate",
  EVENT_TIME: "eventStartTime",
  START_TIME: "eventStartTime",
  EVENT_END_TIME: "eventEndTime",
  TIMEZONE: "timezone",
  LOCATION: "location",
  ADDITIONAL_NOTES: "additionalNotes",
  MEETING_URL: "meetingUrl",
  ONLINE_MEETING_URL: "onlineMeetingUrl",
  CANCEL_URL: "cancelUrl",
  RESCHEDULE_URL: "rescheduleUrl",
  RATING_URL: "ratingUrl",
  NO_SHOW_URL: "noShowUrl",
  ATTENDEE_TIMEZONE: "attendeeTimezone",
  EVENT_START_TIME_IN_ATTENDEE_TIMEZONE: "eventStartTimeInAttendeeTimezone",
  EVENT_END_TIME_IN_ATTENDEE_TIMEZONE: "eventEndTimeInAttendeeTimezone",
  CANCELLATION_REASON: "cancellationReason",
  RESPONSES: "responses",
};

const resolveConditionalTruthiness = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.length > 0;
  if (dayjs.isDayjs(value)) return value.isValid();
  return Boolean(value);
};

export const evaluateConditionals = (text: string, variables: VariablesType): string => {
  const conditionalPattern =
    /\{#if\s+([A-Z][A-Z0-9_]*(?:\.[a-zA-Z0-9_.]+)*)\}([\s\S]*?)(?:\{else\}([\s\S]*?))?\{\/if\}/g;

  return text.replace(conditionalPattern, (fullMatch, key, truthyBranch, falsyBranch) => {
    const hasNestedConditional =
      truthyBranch.includes("{#if") || (typeof falsyBranch === "string" && falsyBranch.includes("{#if"));

    if (hasNestedConditional) {
      return fullMatch;
    }

    const [baseKey, ...nestedKeys] = key.split(".");
    const variablesKey = UPPER_CASE_TO_VARIABLES_KEY[baseKey];
    let value: unknown = variablesKey ? variables[variablesKey] : undefined;

    for (const nestedKey of nestedKeys) {
      if (!value || typeof value !== "object" || dayjs.isDayjs(value)) {
        value = undefined;
        break;
      }
      value = (value as Record<string, unknown>)[nestedKey];
    }

    const selectedBranch = resolveConditionalTruthiness(value) ? truthyBranch : falsyBranch ?? "";
    return selectedBranch.trim();
  });
};

const generateBrandingFooter = (suppressBranding?: boolean): string => {
  return suppressBranding ? "" : `<br><br>_<br><br>Scheduling by ${APP_NAME}`;
};

const constructHtmlOutput = (textContent: string, brandingFooter: string): string => {
  return `<body style="white-space: pre-wrap;">${textContent}${brandingFooter}</body>`;
};

const processTemplateContent = (config: ProcessingConfiguration): TemplateOutput => {
  const timeDisplayFormat = establishTimeDisplayFormat(config.clockDisplay);

  const nameComponents = extractAttendeeNameComponents(
    config.dataVariables.attendeeName,
    config.dataVariables.attendeeFirstName,
    config.dataVariables.attendeeLastName
  );

  const localizedDateString = generateLocalizedDateString(
    config.culturalLocale,
    config.dataVariables.eventStartTime,
    config.dataVariables.timezone
  );

  const locationDisplayValue = resolveLocationDisplayValue(
    config.dataVariables.location,
    config.sourceText.includes("{LOCATION}")
  );

  let processedText = performBasicTokenSubstitution(
    config.sourceText,
    config.dataVariables,
    timeDisplayFormat,
    nameComponents,
    localizedDateString,
    locationDisplayValue
  );

  const customTokens = extractCustomTokens(processedText);

  processedText = processDateTimeTokens(
    processedText,
    customTokens,
    config.dataVariables,
    config.culturalLocale
  );

  processedText = processCustomResponseTokens(processedText, customTokens, config.dataVariables);
  processedText = evaluateConditionals(processedText, config.dataVariables);

  const brandingFooter = generateBrandingFooter(config.brandingSuppressionFlag);
  const htmlOutput = constructHtmlOutput(processedText, brandingFooter);

  return {
    text: processedText,
    html: htmlOutput,
  };
};

const customTemplate = (
  text: string,
  variables: VariablesType,
  locale: string,
  timeFormat?: TimeFormat,
  isBrandingDisabled?: boolean
): TemplateOutput => {
  const processingConfig: ProcessingConfiguration = {
    sourceText: text,
    dataVariables: variables,
    culturalLocale: locale,
    clockDisplay: timeFormat,
    brandingSuppressionFlag: isBrandingDisabled,
  };

  return processTemplateContent(processingConfig);
};

export default customTemplate;
