import { guessEventLocationType } from "@calcom/app-store/locations";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { APP_NAME } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalEventResponses } from "@calcom/types/Calendar";

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
  responses?: CalEventResponses | null;
  meetingUrl?: string;
  cancelLink?: string;
  rescheduleLink?: string;
  ratingUrl?: string;
  noShowUrl?: string;
  attendeeTimezone?: string;
  eventTimeInAttendeeTimezone?: Dayjs;
  eventEndTimeInAttendeeTimezone?: Dayjs;
  eventTime?: Dayjs;
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
  const cancellationUrl = variables.cancelLink ?? "";
  const reschedulingUrl = variables.rescheduleLink ?? "";

  return textContent
    .replaceAll("{EVENT_NAME}", variables.eventName || "")
    .replaceAll("{ORGANIZER}", variables.organizerName || "")
    .replaceAll("{ATTENDEE}", variables.attendeeName || "")
    .replaceAll("{ORGANIZER_NAME}", variables.organizerName || "")
    .replaceAll("{ATTENDEE_NAME}", variables.attendeeName || "")
    .replaceAll("{ATTENDEE_FIRST_NAME}", nameComponents.firstNameComponent)
    .replaceAll("{ATTENDEE_LAST_NAME}", nameComponents.lastNameComponent)
    .replaceAll("{EVENT_DATE}", localizedDate)
    .replaceAll("{EVENT_TIME}", variables.eventDate?.format(timeFormat) || "")
    .replaceAll("{START_TIME}", variables.eventDate?.format(timeFormat) || "")
    .replaceAll("{EVENT_END_TIME}", variables.eventEndTime?.format(timeFormat) || "")
    .replaceAll("{LOCATION}", locationValue)
    .replaceAll("{ADDITIONAL_NOTES}", variables.additionalNotes || "")
    .replaceAll("{ATTENDEE_EMAIL}", variables.attendeeEmail || "")
    .replaceAll("{TIMEZONE}", variables.timeZone || "")
    .replaceAll("{CANCEL_URL}", cancellationUrl)
    .replaceAll("{RESCHEDULE_URL}", reschedulingUrl)
    .replaceAll("{MEETING_URL}", variables.meetingUrl || "")
    .replaceAll("{RATING_URL}", variables.ratingUrl || "")
    .replaceAll("{NO_SHOW_URL}", variables.noShowUrl || "")
    .replaceAll("{ATTENDEE_TIMEZONE}", variables.attendeeTimezone || "")
    .replaceAll(
      "{EVENT_START_TIME_IN_ATTENDEE_TIMEZONE}",
      variables.eventTimeInAttendeeTimezone?.format(timeFormat) || ""
    )
    .replaceAll(
      "{EVENT_END_TIME_IN_ATTENDEE_TIMEZONE}",
      variables.eventEndTimeInAttendeeTimezone?.format(timeFormat) || ""
    );
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
      const formattedTimestamp = variables.eventDate?.locale(locale).format(formatSpecification);
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

  if (!variables.responses) return processedText;

  Object.keys(variables.responses).forEach((responseKey) => {
    const normalizedToken = responseKey
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replaceAll(" ", "_")
      .toUpperCase();

    tokenList.forEach((token) => {
      if (
        token === normalizedToken &&
        variables.responses &&
        variables.responses[responseKey as keyof typeof variables.responses].value
      ) {
        processedText = processedText.replace(
          `{${token}}`,
          variables.responses[responseKey as keyof typeof variables.responses].value.toString()
        );
      }
    });
  });

  return processedText;
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
    config.dataVariables.eventDate,
    config.dataVariables.timeZone
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
